/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, chunk } from 'lodash';
import type { Filter } from '@kbn/es-query';
import { getFieldValue, getEventsMapByFieldValue } from './utils/events';
import type { CreateFieldsMatchEnrichment, EventsMapByEnrichments, EnrichmentType } from './types';
import { getQueryFilter } from '../get_query_filter';

const MAX_CLAUSES = 1000;

export const createSingleFieldMatchEnrichment: CreateFieldsMatchEnrichment = async ({
  index,
  services,
  logger,
  events,
  mappingField,
  createEnrichmentFunction,
  name,
  enrichmentResponseFields,
}) => {
  try {
    logger.debug(`Enrichment ${name}: started`);

    /**
     * Get all unique values of the field to search by.
     * keys are unique values for the eventField, values are arrays of events that have the corrosponding value.
     * */
    const eventsMapByFieldValue: Record<string, typeof events> = getEventsMapByFieldValue(
      events,
      mappingField.eventField
    );

    /** Array of unique field values from events */
    const uniqueEventsValuesToSearchBy: string[] = Object.keys(eventsMapByFieldValue);

    /** Split the unique values into chunks of 1000 to avoid query clause limit */
    const chunksUniqueEventsValuesToSearchBy: string[][] = chunk(
      uniqueEventsValuesToSearchBy,
      MAX_CLAUSES
    );

    /**
     * A list of filters, one filter per chunk of unique values.
     * TODO: we need different logic here to support enriching from the asset criticality index.
     */
    const filters: Filter[] = chunksUniqueEventsValuesToSearchBy
      .map((enrichmentValuesChunk) => {
        return {
          // TODO, what is meta here?
          meta: {
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              should: [{ terms: { [mappingField.enrichmentField]: enrichmentValuesChunk } }],
              minimum_should_match: 1,
            },
          },
        };
      })
      .filter((query) => query.query?.bool?.should?.length > 0);

    /** perform each search concurrently */
    const results: Array<Promise<EnrichmentType[]>> = filters.map(async (query) => {
      try {
        const response = await services.scopedClusterClient.asCurrentUser.search({
          index,
          body: {
            _source: '',
            fields: enrichmentResponseFields,
            query: getQueryFilter({
              query: '',
              language: 'kuery',
              filters: [query],
              index,
              exceptionFilter: undefined,
            }),
          },
          track_total_hits: false,
        });

        return response.hits.hits;
      } catch (e) {
        return [];
      }
    });

    /** The returned values from each successful search */
    const enrichmentsResults: EnrichmentType[][] = (await Promise.allSettled(results))
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<EnrichmentType[]>)?.value);

    /** The documents from the other index which have data we want to use to enrich events. */
    const enrichments: EnrichmentType[] = flatten(enrichmentsResults);

    if (enrichments.length === 0) {
      logger.debug(`Enrichment ${name}: no enrichment found`);
      return {};
    }

    /**
     * a map of event ids to functions that will enrich the event.
     */
    const eventsMapById: EventsMapByEnrichments = enrichments.reduce<EventsMapByEnrichments>(
      (acc, enrichment) => {
        /** determines which events this enrichment should be applied to */
        const enrichmentValue = getFieldValue(enrichment, mappingField.enrichmentField);

        if (!enrichmentValue) return acc;

        const eventsWithoutEnrichment = eventsMapByFieldValue[enrichmentValue];

        eventsWithoutEnrichment?.forEach((event) => {
          // TODO: why would we create an array, and then a function in that array, for each alert?
          // TODO, if we do need functions here, we could 'create' the enrichment function once per enrichment.
          acc[event._id] = [createEnrichmentFunction(enrichment)];
        });

        return acc;
      },
      {}
    );

    logger.debug(
      `Enrichment ${name}: return ${Object.keys(eventsMapById).length} events ready to be enriched`
    );
    return eventsMapById;
  } catch (error) {
    logger.error(`Enrichment ${name} failed: ${error}`);
    return {};
  }
};
