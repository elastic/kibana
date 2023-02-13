/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';

import { ThreatMatchQueryType } from './types';
import type {
  GetThreatListOptions,
  ThreatMatchNamedQuery,
  ThreatTermNamedQuery,
  ThreatListItem,
  SignalValuesMap,
} from './types';
import { getThreatList } from './get_threat_list';
import { decodeThreatMatchNamedQuery } from './utils';

import { MAX_NUMBER_OF_SIGNAL_MATCHES } from './enrich_signal_threat_matches';

export type SignalsQueryMap = Map<string, ThreatMatchNamedQuery[]>;

interface GetSignalsMatchesFromThreatIndexOptions {
  threatSearchParams: Omit<GetThreatListOptions, 'searchAfter'>;
  eventsCount: number;
  signalValueMap?: SignalValuesMap;
}

/**
 * fetches threats and creates signals map from results, that matches signal is with list of threat queries
 */
export const getSignalsQueryMapFromThreatIndex = async ({
  threatSearchParams,
  eventsCount,
  signalValueMap,
}: GetSignalsMatchesFromThreatIndexOptions): Promise<SignalsQueryMap> => {
  let threatList: Awaited<ReturnType<typeof getThreatList>> | undefined;
  const signalsQueryMap = new Map<string, ThreatMatchNamedQuery[]>();
  // number of threat matches per signal is limited by MAX_NUMBER_OF_SIGNAL_MATCHES. Once it hits this number, threats stop to be processed for a signal
  const maxThreatsReachedMap = new Map<string, boolean>();

  const addSignalValueToMap = ({
    signalId,
    threatHit,
    decodedQuery,
  }: {
    signalId: string;
    threatHit: ThreatListItem;
    decodedQuery: ThreatMatchNamedQuery | ThreatTermNamedQuery;
  }) => {
    const signalMatch = signalsQueryMap.get(signalId);
    if (!signalMatch) {
      signalsQueryMap.set(signalId, []);
    }

    const threatQuery = {
      id: threatHit._id,
      index: threatHit._index,
      field: decodedQuery.field,
      value: decodedQuery.value,
      queryType: decodedQuery.queryType,
    };

    if (!signalMatch) {
      signalsQueryMap.set(signalId, [threatQuery]);
      return;
    }

    if (signalMatch.length === MAX_NUMBER_OF_SIGNAL_MATCHES) {
      maxThreatsReachedMap.set(signalId, true);
    } else if (signalMatch.length < MAX_NUMBER_OF_SIGNAL_MATCHES) {
      signalMatch.push(threatQuery);
    }
  };

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
        const decodedQuery = decodeThreatMatchNamedQuery(matchedQuery);
        const signalId = decodedQuery.id;

        if (decodedQuery.queryType === ThreatMatchQueryType.term) {
          const threatValue = get(threatHit?._source, decodedQuery.value);
          const values = Array.isArray(threatValue) ? threatValue : [threatValue];

          values.forEach((value) => {
            if (value && signalValueMap) {
              const ids = signalValueMap[decodedQuery.field][value?.toString()];

              ids?.forEach((id: string) => {
                addSignalValueToMap({
                  signalId: id,
                  threatHit,
                  decodedQuery,
                });
              });
            }
          });
        } else {
          if (!signalId) {
            return;
          }

          addSignalValueToMap({
            signalId,
            threatHit,
            decodedQuery,
          });
        }
      });
    });
  }

  return signalsQueryMap;
};
