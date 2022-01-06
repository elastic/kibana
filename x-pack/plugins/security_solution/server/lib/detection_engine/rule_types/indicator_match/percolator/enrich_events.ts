/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import get from 'lodash/get';
import { EventDoc } from '../../../signals/threat_mapping/types';
import { decodeThreatMatchNamedQuery } from '../../../signals/threat_mapping/utils';
import { ENRICHMENT_TYPES } from '../../../../../../common/cti/constants';
import { SearchResponse } from '../../../../types';
import { EventHit } from '../../../signals/types';

interface EnrichEventsOptions {
  chunkedSourceEventHits: EventHit[][];
  matchedPercolateQueriesByChunk: Array<SearchResponse<EventDoc>>;
}

export const enrichEvents = ({
  chunkedSourceEventHits,
  matchedPercolateQueriesByChunk,
}: EnrichEventsOptions) => {
  const enrichedEvents: EventHit[] = [];
  chunkedSourceEventHits.forEach((hits, chunkIndex) => {
    const relevantPercolatorHits = matchedPercolateQueriesByChunk[chunkIndex].hits.hits;
    relevantPercolatorHits.forEach(({ _id, query, fields, ...indicator }) => {
      const { id, index, field, value } = decodeThreatMatchNamedQuery(_id);
      const indicesOfEventsToBeEnriched: number[] =
        (fields?._percolator_document_slot as number[]) ?? [];
      indicesOfEventsToBeEnriched.forEach((indexOfEvent: number) => {
        const eventToBeEnriched = hits[indexOfEvent];
        const source = (eventToBeEnriched._source as { threat?: object }) ?? {};
        const existingThreatFields = source.threat ?? {};
        const existingEnrichments =
          (existingThreatFields as { enrichments?: unknown[] }).enrichments ?? [];
        const enrichedEvent = {
          ...eventToBeEnriched,
          _source: {
            ...source,
            threat: {
              ...existingThreatFields,
              enrichments: [
                ...existingEnrichments,
                {
                  matched: {
                    atomic: get(indicator, value),
                    field,
                    id,
                    index,
                    type: ENRICHMENT_TYPES.IndicatorMatchRule,
                  },
                  indicator,
                },
              ],
            },
          },
        };
        enrichedEvents.push(enrichedEvent as EventHit);
      });
    });
  });
  return enrichedEvents;
};
