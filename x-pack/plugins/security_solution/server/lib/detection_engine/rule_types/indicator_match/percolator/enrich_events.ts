/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SignalSource } from '../../../signals/types';
import { BaseHit } from '../../../../../../common/detection_engine/types';
import { ThreatEnrichment } from '../../../signals/threat_mapping/types';

interface EnrichEventsOptions {
  hits: Array<estypes.SearchHit<SignalSource>>;
  percolatorResponse: estypes.SearchResponse<
    { threat: { enrichments: ThreatEnrichment[] } },
    unknown
  >;
}

export type EnrichedEvent = BaseHit<SignalSource> & {
  _source: {
    threat: {
      enrichments: ThreatEnrichment[];
    };
  };
};

export const enrichEvents = ({ hits, percolatorResponse }: EnrichEventsOptions) =>
  percolatorResponse.hits.hits.reduce<EnrichedEvent[]>((enrichedEvents, percolatorHit) => {
    const enrichments = percolatorHit._source?.threat?.enrichments ?? [];

    percolatorHit.fields?._percolator_document_slot.forEach((indexOfEvent: number) => {
      const event = hits[indexOfEvent];
      const indexOfEnrichedEvent = enrichedEvents.findIndex(
        (enrichedEvent) => enrichedEvent._id === event._id
      );
      if (indexOfEnrichedEvent > -1) {
        enrichments.forEach((enrichment) =>
          enrichedEvents[indexOfEnrichedEvent]._source.threat.enrichments.push(enrichment)
        );
      } else {
        const _source = (event._source as { threat?: object }) ?? {};
        const threat = _source.threat ?? {};
        const existingEnrichments =
          (threat as { enrichments?: ThreatEnrichment[] }).enrichments ?? [];
        enrichedEvents.push({
          ...event,
          _source: {
            ..._source,
            threat: {
              ...threat,
              enrichments: [...existingEnrichments, ...enrichments],
            },
          },
        });
      }
    });

    return enrichedEvents;
  }, []);
