/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetThreatListOptions, ThreatMatchNamedQuery } from './types';
import { getThreatList } from './get_threat_list';
import { decodeThreatMatchNamedQuery } from './utils';

import { MAX_NUMBER_OF_SIGNAL_MATCHES } from './enrich_signal_threat_matches';
interface GetSignalsMatchesFromThreatIndexOptions {
  threatSearchParams: Omit<GetThreatListOptions, 'searchAfter'>;
  eventsCount: number;
}

/**
 * fetch threats and creates signals matches map form them
 */
export const getSignalsMatchesFromThreatIndex = async ({
  threatSearchParams,
  eventsCount,
}: GetSignalsMatchesFromThreatIndexOptions): Promise<Map<string, ThreatMatchNamedQuery[]>> => {
  let threatList: Awaited<ReturnType<typeof getThreatList>> | undefined;
  const signalsMap = new Map<string, ThreatMatchNamedQuery[]>();
  // number of threat matches per signal is limited by MAX_NUMBER_OF_SIGNAL_MATCHES. Once it hits this number, threats stop to be processed for a signal
  const maxThreatsReachedMap = new Map<string, boolean>();

  while (
    maxThreatsReachedMap.size < eventsCount &&
    (threatList ? threatList?.hits.hits.length > 0 : true)
  ) {
    threatList = await getThreatList({
      ...threatSearchParams,
      searchAfter: threatList?.hits.hits[threatList.hits.hits.length - 1].sort || undefined,
    });

    threatList.hits.hits.forEach((threatHit) => {
      const matchedQueries = threatHit?.matched_queries || [];

      matchedQueries.forEach((matchedQuery) => {
        const matchDecoded = decodeThreatMatchNamedQuery(matchedQuery);

        if (maxThreatsReachedMap.get(matchDecoded.id)) {
          return;
        }

        const threatQuery = {
          id: threatHit._id,
          index: threatHit._index,
          field: matchDecoded.field,
          value: matchDecoded.value,
        };

        const signalMatch = signalsMap.get(matchDecoded.id);

        if (!signalMatch) {
          signalsMap.set(matchDecoded.id, [threatQuery]);
          return;
        }

        if (signalMatch.length === MAX_NUMBER_OF_SIGNAL_MATCHES) {
          maxThreatsReachedMap.set(matchDecoded.id, true);
        } else if (signalMatch.length < MAX_NUMBER_OF_SIGNAL_MATCHES) {
          signalMatch.push(threatQuery);
        }
      });
    });
  }

  return signalsMap;
};
