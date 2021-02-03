/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isObject } from 'lodash';

import type { SignalSearchResponse, SignalSourceHit } from '../types';
import type {
  GetMatchedThreats,
  ThreatIndicator,
  ThreatListItem,
  ThreatMatchNamedQuery,
} from './types';
import { extractNamedQueries } from './utils';

const DEFAULT_INDICATOR_PATH = 'threat.indicator';
const getSignalId = (signal: SignalSourceHit): string => signal._id;

export const groupAndMergeSignalMatches = (signalHits: SignalSourceHit[]): SignalSourceHit[] => {
  const dedupedHitsMap = signalHits.reduce<Map<unknown, SignalSourceHit>>((acc, signalHit) => {
    const signalId = getSignalId(signalHit);
    if (!acc.has(signalId)) {
      acc.set(signalId, signalHit);
    } else {
      const existingSignalHit = acc.get(signalId) as SignalSourceHit;
      const existingQueries = existingSignalHit?.matched_queries ?? [];
      const newQueries = signalHit.matched_queries ?? [];
      existingSignalHit.matched_queries = [...existingQueries, ...newQueries];

      acc.set(signalId, existingSignalHit);
    }

    return acc;
  }, new Map());
  const dedupedHits = Array.from(dedupedHitsMap.values());
  return dedupedHits;
};

export const buildMatchedIndicator = ({
  queries,
  threats,
  indicatorPath = DEFAULT_INDICATOR_PATH,
}: {
  queries: ThreatMatchNamedQuery[];
  threats: ThreatListItem[];
  indicatorPath?: string;
}): ThreatIndicator[] =>
  queries.map((query) => {
    const matchedThreat = threats.find((threat) => threat._id === query.id);
    const indicatorValue = get(matchedThreat?._source, indicatorPath) as unknown;
    const indicator = [indicatorValue].flat()[0] ?? {};
    if (!isObject(indicator)) {
      throw new Error(`Expected indicator field to be an object, but found: ${indicator}`);
    }
    const atomic = get(matchedThreat?._source, query.value) as unknown;
    const type = get(indicator, 'type') as unknown;

    return {
      ...indicator,
      matched: { atomic, field: query.value, type },
    };
  });

export const enrichSignalThreatMatches = async (
  signals: SignalSearchResponse,
  getMatchedThreats: GetMatchedThreats
): Promise<SignalSearchResponse> => {
  const signalHits = signals.hits.hits;
  if (signalHits.length === 0) {
    return signals;
  }

  const uniqueHits = groupAndMergeSignalMatches(signalHits);
  const signalMatches = uniqueHits.map((signalHit) => extractNamedQueries(signalHit));
  const matchedThreatIds = [...new Set(signalMatches.flat().map(({ id }) => id))];
  const matchedThreats = await getMatchedThreats(matchedThreatIds);
  const matchedIndicators = signalMatches.map((queries) =>
    buildMatchedIndicator({ queries, threats: matchedThreats })
  );

  const enrichedSignals = uniqueHits.map((signalHit, i) => {
    const threat = get(signalHit._source, 'threat') ?? {};
    if (!isObject(threat)) {
      throw new Error(`Expected threat field to be an object, but found: ${threat}`);
    }
    const existingIndicatorValue = get(signalHit._source, 'threat.indicator') ?? [];
    const existingIndicators = [existingIndicatorValue].flat(); // ensure indicators is an array

    return {
      ...signalHit,
      _source: {
        ...signalHit._source,
        threat: {
          ...threat,
          indicator: [...existingIndicators, ...matchedIndicators[i]],
        },
      },
    };
  });
  // eslint-disable-next-line require-atomic-updates
  signals.hits.hits = enrichedSignals;

  return signals;
};
