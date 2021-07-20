/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isObject } from 'lodash';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';

import type { SignalSearchResponse, SignalSourceHit } from '../types';
import type {
  GetMatchedThreats,
  ThreatIndicator,
  ThreatListItem,
  ThreatMatchNamedQuery,
} from './types';
import { extractNamedQueries } from './utils';

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

export const buildMatchedIndicator = ({
  queries,
  threats,
  indicatorPath,
}: {
  queries: ThreatMatchNamedQuery[];
  threats: ThreatListItem[];
  indicatorPath: string;
}): ThreatIndicator[] =>
  queries.map((query) => {
    const matchedThreat = threats.find((threat) => threat._id === query.id);
    const indicatorValue = get(matchedThreat?._source, indicatorPath) as unknown;
    const indicator = [indicatorValue].flat()[0] ?? {};
    if (!isObject(indicator)) {
      throw new Error(`Expected indicator field to be an object, but found: ${indicator}`);
    }
    const atomic = get(matchedThreat?._source, query.value) as unknown;
    const event = get(matchedThreat?._source, 'event') as unknown;

    return {
      ...indicator,
      event,
      matched: {
        atomic,
        field: query.field,
        id: query.id,
        index: query.index,
        type: ENRICHMENT_TYPES.IndicatorMatchRule,
      },
    };
  });

export const enrichSignalThreatMatches = async (
  signals: SignalSearchResponse,
  getMatchedThreats: GetMatchedThreats,
  indicatorPath: string
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
    buildMatchedIndicator({
      indicatorPath,
      queries,
      threats: matchedThreats,
    })
  );

  const enrichedSignals: SignalSourceHit[] = uniqueHits.map((signalHit, i) => {
    const threat = get(signalHit._source, 'threat') ?? {};
    if (!isObject(threat)) {
      throw new Error(`Expected threat field to be an object, but found: ${threat}`);
    }
    // We are not using INDICATOR_DESTINATION_PATH here because the code above
    // and below make assumptions about its current value, 'threat.indicator',
    // and making this code dynamic on an arbitrary path would introduce several
    // new issues.
    const existingIndicatorValue = get(signalHit._source, 'threat.indicator') ?? [];
    const existingIndicators = [existingIndicatorValue].flat(); // ensure indicators is an array

    return {
      ...signalHit,
      _source: {
        ...signalHit._source!,
        threat: {
          ...threat,
          indicator: [...existingIndicators, ...matchedIndicators[i]],
        },
      },
    };
  });

  return {
    ...signals,
    hits: {
      ...signals.hits,
      hits: enrichedSignals,
      total: isObject(signals.hits.total)
        ? { ...signals.hits.total, value: enrichedSignals.length }
        : enrichedSignals.length,
    },
  };
};
