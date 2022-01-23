/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import get from 'lodash/get';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { decodeThreatMatchNamedQuery } from '../../../signals/threat_mapping/utils';
import { ENRICHMENT_TYPES } from '../../../../../../common/cti/constants';
import { SignalSource } from '../../../signals/types';
import { BaseHit, SearchTypes } from '../../../../../../common/detection_engine/types';

interface EnrichEventsOptions {
  chunkedSourceEventHits: Array<Array<BaseHit<SignalSource>>>;
  percolatorResponses: Array<estypes.SearchResponse<unknown, unknown>>;
  threatIndicatorPath: string;
}

interface ThreatEnrichment {
  matched: {
    id: string;
    atomic: SearchTypes;
    index: string;
    type: string;
    field: string;
  };
  [key: string]: unknown;
}

export type EnrichedEvent = BaseHit<SignalSource> & {
  _source: {
    threat: {
      enrichments: ThreatEnrichment[];
    };
  };
};

export const enrichEvents = ({
  chunkedSourceEventHits,
  percolatorResponses,
  threatIndicatorPath,
}: EnrichEventsOptions) => {
  const enrichedEvents: EnrichedEvent[] = [];

  chunkedSourceEventHits.forEach((sourceEventHits, chunkIndex) => {
    const percolatorHits = percolatorResponses[chunkIndex].hits.hits;

    percolatorHits.forEach((percolatorHit) => {
      const enrichment = createEnrichmentFromPercolatorHit(percolatorHit, threatIndicatorPath);

      const indicesOfEventsToBeEnriched: number[] =
        (percolatorHit.fields?._percolator_document_slot as number[]) ?? [];

      indicesOfEventsToBeEnriched.forEach((indexOfEvent: number) => {
        enrichedEvents.push(enrichEvent(sourceEventHits[indexOfEvent], enrichment));
      });
    });
  });

  return mergeDuplicates(enrichedEvents);
};

export const mergeDuplicates = (events: EnrichedEvent[]) =>
  events.reduce<EnrichedEvent[]>((acc, event) => {
    const indexOfAlreadyEnrichedEvent = acc.findIndex((item) => item._id === event._id);
    if (indexOfAlreadyEnrichedEvent > -1) {
      const enrichmentToMerge =
        event._source.threat.enrichments[event._source.threat.enrichments.length - 1];
      acc[indexOfAlreadyEnrichedEvent] = enrichEvent(
        acc[indexOfAlreadyEnrichedEvent],
        enrichmentToMerge
      );
      return acc;
    }
    return [...acc, event];
  }, []);

export const enrichEvent = (
  event: BaseHit<SignalSource>,
  enrichment: ThreatEnrichment
): EnrichedEvent => {
  const _source = (event._source as { threat?: object }) ?? {};
  const threat = _source.threat ?? {};
  const enrichments = (threat as { enrichments?: ThreatEnrichment[] }).enrichments ?? [];

  return {
    ...event,
    _source: {
      ..._source,
      threat: {
        ...threat,
        enrichments: [...enrichments, enrichment],
      },
    },
  };
};

export const createEnrichmentFromPercolatorHit = (
  indicator: estypes.SearchHit<unknown>,
  threatIndicatorPath: string
): ThreatEnrichment => {
  const indicatorSource = indicator._source as { [key: string]: unknown };
  const feed = get(indicatorSource, 'threat.feed');
  return {
    matched: getMatchedFromId(indicator),
    indicator: get(indicatorSource, threatIndicatorPath),
    feed,
  };
};

export const getMatchedFromId = (indicator: estypes.SearchHit<unknown>) => {
  const { id, index, field, value } = decodeThreatMatchNamedQuery(indicator._id);
  return {
    atomic: get(indicator._source, value),
    field,
    id,
    index,
    type: ENRICHMENT_TYPES.IndicatorMatchRule,
  };
};
