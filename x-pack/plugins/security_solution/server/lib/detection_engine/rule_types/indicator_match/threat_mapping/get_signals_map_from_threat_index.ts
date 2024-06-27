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

interface GetSignalsQueryMapFromThreatIndexOptionsTerms {
  threatSearchParams: Omit<GetThreatListOptions, 'searchAfter'>;
  eventsCount: number;
  signalValueMap: SignalValuesMap;
  termsQueryAllowed: true;
}

interface GetSignalsQueryMapFromThreatIndexOptionsMatch {
  threatSearchParams: Omit<GetThreatListOptions, 'searchAfter'>;
  eventsCount: number;
  termsQueryAllowed: false;
}

/**
 * fetches threats and creates signals map from results, that matches signal is with list of threat queries
 */
/**
 * fetches threats and creates signals map from results, that matches signal is with list of threat queries
 * @param options.termsQueryAllowed - if terms query allowed to be executed, then signalValueMap should be provided
 * @param options.signalValueMap - map of signal values from terms query results
 */
export async function getSignalsQueryMapFromThreatIndex(
  options:
    | GetSignalsQueryMapFromThreatIndexOptionsTerms
    | GetSignalsQueryMapFromThreatIndexOptionsMatch
): Promise<SignalsQueryMap> {
  const { threatSearchParams, eventsCount, termsQueryAllowed } = options;

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

    const threatQuery = {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: threatHit._id!,
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

  threatList = await getThreatList({ ...threatSearchParams, searchAfter: undefined });

  while (maxThreatsReachedMap.size < eventsCount && threatList?.hits.hits.length > 0) {
    threatList.hits.hits.forEach((threatHit) => {
      const matchedQueries = threatHit?.matched_queries || [];

      matchedQueries.forEach((matchedQuery) => {
        const decodedQuery = decodeThreatMatchNamedQuery(matchedQuery);
        const signalId = decodedQuery.id;

        if (decodedQuery.queryType === ThreatMatchQueryType.term && termsQueryAllowed) {
          const threatValue = get(threatHit?._source, decodedQuery.value);
          const values = Array.isArray(threatValue) ? threatValue : [threatValue];

          values.forEach((value) => {
            if (value && options.signalValueMap) {
              const ids = options.signalValueMap[decodedQuery.field][value?.toString()];

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

    threatList = await getThreatList({
      ...threatSearchParams,
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
    });
  }

  return signalsQueryMap;
}
