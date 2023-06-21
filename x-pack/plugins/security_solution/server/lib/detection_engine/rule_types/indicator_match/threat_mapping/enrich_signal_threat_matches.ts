/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isObject } from 'lodash';
import { ENRICHMENT_TYPES, FEED_NAME_PATH } from '../../../../../../common/cti/constants';

import type { SignalSourceHit } from '../../types';
import type { ThreatEnrichment, ThreatListItem, ThreatMatchNamedQuery } from './types';

export const MAX_NUMBER_OF_SIGNAL_MATCHES = 200;

const getSignalId = (signal: SignalSourceHit): string => signal._id;

export const groupAndMergeSignalMatches = (signalHits: SignalSourceHit[]): SignalSourceHit[] => {
  const dedupedHitsMap = signalHits.reduce<Record<string, SignalSourceHit>>((acc, signalHit) => {
    const signalId = getSignalId(signalHit);
    const existingSignalHit = acc[signalId];

    if (existingSignalHit == null) {
      acc[signalId] = signalHit;
    } else {
      const existingQueries = existingSignalHit?.matched_queries ?? [];
      const newQueries = signalHit.matched_queries ?? [];
      existingSignalHit.matched_queries = [...existingQueries, ...newQueries];

      acc[signalId] = existingSignalHit;
    }

    return acc;
  }, {});
  const dedupedHits = Object.values(dedupedHitsMap);
  return dedupedHits;
};

export const buildEnrichments = ({
  queries,
  threats,
  indicatorPath,
}: {
  queries: ThreatMatchNamedQuery[];
  threats: ThreatListItem[];
  indicatorPath: string;
}): ThreatEnrichment[] =>
  queries.map((query) => {
    const matchedThreat = threats.find((threat) => threat._id === query.id);
    const indicatorValue = get(matchedThreat?._source, indicatorPath) as unknown;
    const feedName = (get(matchedThreat?._source, FEED_NAME_PATH) ?? '') as string;
    const indicator = ([indicatorValue].flat()[0] ?? {}) as Record<string, unknown>;
    if (!isObject(indicator)) {
      throw new Error(`Expected indicator field to be an object, but found: ${indicator}`);
    }
    const feed: { name?: string } = {};
    if (feedName) {
      feed.name = feedName;
    }
    return {
      indicator,
      feed,
      matched: {
        atomic: undefined,
        field: query.field,
        id: query.id,
        index: query.index,
        type: ENRICHMENT_TYPES.IndicatorMatchRule,
      },
    };
  });

const enrichSignalWithThreatMatches = (
  signalHit: SignalSourceHit,
  enrichmentsWithoutAtomic: { [key: string]: ThreatEnrichment[] }
) => {
  const threat = get(signalHit._source, 'threat') ?? {};
  if (!isObject(threat)) {
    throw new Error(`Expected threat field to be an object, but found: ${threat}`);
  }
  // We are not using ENRICHMENT_DESTINATION_PATH here because the code above
  // and below make assumptions about its current value, 'threat.enrichments',
  // and making this code dynamic on an arbitrary path would introduce several
  // new issues.
  const existingEnrichmentValue = get(signalHit._source, 'threat.enrichments') ?? [];
  const existingEnrichments = [existingEnrichmentValue].flat(); // ensure enrichments is an array
  const newEnrichmentsWithoutAtomic = enrichmentsWithoutAtomic[signalHit._id] ?? [];
  const newEnrichments = newEnrichmentsWithoutAtomic.map((enrichment) => ({
    ...enrichment,
    matched: {
      ...enrichment.matched,
      atomic: get(signalHit._source, enrichment.matched.field),
    },
  }));

  return {
    ...signalHit,
    _source: {
      ...signalHit._source,
      threat: {
        ...threat,
        enrichments: [...existingEnrichments, ...newEnrichments],
      },
    },
  };
};

/**
 * enrich signals threat matches using signalsMap(Map<string, ThreatMatchNamedQuery[]>) that has match named query results
 */
export const enrichSignalThreatMatchesFromSignalsMap = async (
  signals: SignalSourceHit[],
  getMatchedThreats: () => Promise<ThreatListItem[]>,
  indicatorPath: string,
  signalsMap: Map<string, ThreatMatchNamedQuery[]>
): Promise<SignalSourceHit[]> => {
  if (signals.length === 0) {
    return [];
  }

  const uniqueHits = groupAndMergeSignalMatches(signals);
  const matchedThreats = await getMatchedThreats();

  const enrichmentsWithoutAtomic: Record<string, ThreatEnrichment[]> = {};

  uniqueHits.forEach((hit) => {
    enrichmentsWithoutAtomic[hit._id] = buildEnrichments({
      indicatorPath,
      queries: signalsMap.get(hit._id) ?? [],
      threats: matchedThreats,
    });
  });

  const enrichedSignals: SignalSourceHit[] = uniqueHits.map((signalHit) =>
    enrichSignalWithThreatMatches(signalHit, enrichmentsWithoutAtomic)
  );

  return enrichedSignals;
};
