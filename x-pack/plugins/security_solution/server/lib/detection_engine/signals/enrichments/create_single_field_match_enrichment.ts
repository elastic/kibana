/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, chunk } from 'lodash';
import { searchEnrichments } from './search_enrichments';
import { makeSingleFieldMatchQuery } from './utils/requests';
import { getEventValue, getFieldValue } from './utils/events';
import type { CreateFieldsMatchEnrichment, EventsMapByEnrichments, EnrichmentType } from './types';

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

    const eventsWithField = events.filter((event) => getEventValue(event, mappingField.eventField));
    const eventsMapByFieldValue = eventsWithField.reduce((acc, event) => {
      const eventFieldValue = getEventValue(event, mappingField.eventField);

      if (!eventFieldValue) return {};

      acc[eventFieldValue] ??= [];
      acc[eventFieldValue].push(event);

      return acc;
    }, {} as { [key: string]: typeof events });

    const uniqueEventsValuesToSearchBy = Object.keys(eventsMapByFieldValue);
    const chunksUniqueEventsValuesToSearchBy = chunk(uniqueEventsValuesToSearchBy, MAX_CLAUSES);

    const getAllEnrichment = chunksUniqueEventsValuesToSearchBy
      .map((enrichmentValuesChunk) =>
        makeSingleFieldMatchQuery({
          values: enrichmentValuesChunk,
          searchByField: mappingField.enrichmentField,
        })
      )
      .filter((query) => query.query?.bool?.should?.length > 0)
      .map((query) =>
        searchEnrichments({
          index,
          services,
          logger,
          query,
          fields: enrichmentResponseFields,
        })
      );

    const enrichmentsResults = (await Promise.allSettled(getAllEnrichment))
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<EnrichmentType[]>)?.value);

    const enrichments = flatten(enrichmentsResults);

    if (enrichments.length === 0) {
      logger.debug(`Enrichment ${name}: no enrichment found`);
      return {};
    }

    const eventsMapById = enrichments.reduce<EventsMapByEnrichments>((acc, enrichment) => {
      const enrichmentValue = getFieldValue(enrichment, mappingField.enrichmentField);

      if (!enrichmentValue) return acc;

      const eventsWithoutEnrchment = eventsMapByFieldValue[enrichmentValue];

      eventsWithoutEnrchment?.forEach((event) => {
        acc[event._id] = [createEnrichmentFunction(enrichment)];
      });

      return acc;
    }, {});

    logger.debug(
      `Enrichment ${name}: return ${Object.keys(eventsMapById).length} events ready to be enriched`
    );
    return eventsMapById;
  } catch (error) {
    logger.error(`Enrichment ${name}: throw error ${error}`);
    return {};
  }
};
