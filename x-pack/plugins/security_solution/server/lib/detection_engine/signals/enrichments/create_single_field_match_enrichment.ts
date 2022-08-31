/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { searchEnrichments } from './search_enrichments';
import { makeSinleFieldMathRequest } from './utils/requests';
import { getEventValue } from './utils/events';
import type { CreateFieldsMatchEnrichment, EventsMapByEnrichments } from './types';

export const createSingleFieldMatchEnrichment: CreateFieldsMatchEnrichment = async ({
  index,
  services,
  logger,
  events,
  mappingField,
  createEnrichmentFunction,
  name,
}) => {
  logger.debug(`Enrichment ${name}: started`);

  const eventsWithField = events.filter((event) => getEventValue(event, mappingField.eventField));
  const eventsMapByFieldValue = eventsWithField.reduce((acc, event) => {
    const eventFieldValue = getEventValue(event, mappingField.eventField);

    if (!eventFieldValue) return {};

    acc[eventFieldValue] ??= [];
    acc[eventFieldValue].push(event);

    return acc;
  }, {} as { [key: string]: typeof events });
  const queryResult = makeSinleFieldMathRequest({
    events: eventsWithField,
    mappingField,
  });
  logger.debug(`Enrichment ${name}: ${JSON.stringify(events)}`);
  if (queryResult.query?.bool?.should?.length === 0) {
    logger.debug(`Enrichment ${name}: events doesn't have any field to enrich`);
    return {};
  }

  const enrichments = await searchEnrichments({
    index,
    services,
    logger,
    query: queryResult,
  });

  if (enrichments.length === 0) {
    logger.debug(`Enrichment ${name}: no enrichment found`);
    return {};
  }

  const eventsMapById = enrichments.reduce<EventsMapByEnrichments>((acc, enrichment) => {
    const enrichmentValue = get(enrichment, `_source.${mappingField.enrichmentField}`);

    const eventsWithoutEnrchment = eventsMapByFieldValue[enrichmentValue];

    eventsWithoutEnrchment.forEach((event) => {
      acc[event._id] = [createEnrichmentFunction(enrichment)];
    });

    return acc;
  }, {});

  logger.debug(
    `Enrichment ${name}: return ${Object.keys(eventsMapById).length} events ready to be enriched`
  );
  return eventsMapById;
};
