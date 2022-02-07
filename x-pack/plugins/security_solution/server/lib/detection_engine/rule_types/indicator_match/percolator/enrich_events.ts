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
  threatIndicatorPath: string;
}

export type EnrichedEvent = BaseHit<SignalSource> & {
  _source: {
    threat: {
      enrichments: ThreatEnrichment[];
    };
  };
};

export const enrichEvents = ({ hits, percolatorResponse }: EnrichEventsOptions) => {
  const enrichedEvents: EnrichedEvent[] = [];

  const percolatorHits = percolatorResponse.hits.hits;

  percolatorHits.forEach((percolatorHit) => {
    const enrichments = percolatorHit._source?.threat?.enrichments ?? [];

    percolatorHit.fields?._percolator_document_slot.forEach((indexOfEvent: number) => {
      const event = hits[indexOfEvent];
      const indexOfAlreadyEnrichedEvent = enrichedEvents.findIndex(
        (item) => item._id === event._id
      );
      if (indexOfAlreadyEnrichedEvent > -1) {
        enrichedEvents[indexOfAlreadyEnrichedEvent]._source.threat.enrichments.concat(enrichments);
      } else {
        enrichedEvents.push(enrichEvent(hits[indexOfEvent], enrichments));
      }
    });
  });

  return enrichedEvents;
};

export const enrichEvent = (
  event: estypes.SearchHit<SignalSource>,
  enrichments: ThreatEnrichment[]
): EnrichedEvent => {
  const _source = (event._source as { threat?: object }) ?? {};
  const threat = _source.threat ?? {};
  const existingEnrichments = (threat as { enrichments?: ThreatEnrichment[] }).enrichments ?? [];

  return {
    ...event,
    _source: {
      ..._source,
      threat: {
        ...threat,
        enrichments: [...existingEnrichments, ...enrichments],
      },
    },
  };
};
