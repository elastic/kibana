/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import type { SignalSearchResponse } from '../types';
import type {
  GetMatchedThreats,
  ThreatIndicator,
  ThreatListItem,
  ThreatMatchNamedQuery,
} from './types';
import { extractNamedQueries } from './utils';

export const buildMatchedIndicator = ({
  queries,
  threats,
  indicatorPath = 'threat.indicator',
}: {
  queries: ThreatMatchNamedQuery[];
  threats: ThreatListItem[];
  indicatorPath?: string;
}): ThreatIndicator[] =>
  queries.map((query) => {
    const matchedThreat = threats.find((threat) => threat._id === query.id);
    // TODO what if this is an array? Grab the first?
    const indicator = get(matchedThreat?._source, indicatorPath);
    const atomic = get(matchedThreat?._source, query.value);
    const type = get(indicator, 'type');
    // console.log('matchedThreat', JSON.stringify(matchedThreat, null, 2));
    // console.log('indicator', JSON.stringify(indicator, null, 2));

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
  // TODO: merge duplicate signals

  const matches = signalHits.map((signalHit) => extractNamedQueries(signalHit));
  const matchedThreatIds = [...new Set(matches.flat().map(({ id }) => id))];
  const matchedThreats = await getMatchedThreats(matchedThreatIds);
  const matchedIndicators = matches.map((queries) =>
    buildMatchedIndicator({ queries, threats: matchedThreats })
  );

  const enrichedSignals = signalHits.map((signalHit, i) => {
    const threat = get(signalHit._source, 'threat') ?? {};
    const existingIndicators = get(signalHit._source, 'threat.indicator') ?? [];

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
