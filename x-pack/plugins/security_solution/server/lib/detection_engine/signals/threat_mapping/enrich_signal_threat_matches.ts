/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isObject } from 'lodash';
import { ENRICHMENT_TYPES, FEED_NAME_PATH } from '../../../../../common/cti/constants';

import type { SignalSourceHit } from '../types';
import type {
  GetMatchedThreats,
  ThreatEnrichment,
  ThreatListItem,
  ThreatMatchNamedQuery,
  SignalMatch,
  SignalValuesMap,
  ThreatTermNamedQuery,
} from './types';
import { ThreatMatchQueryType } from './types';
import { extractNamedQueries } from './utils';

export const MAX_NUMBER_OF_SIGNAL_MATCHES = 1000;

export const getSignalMatchesFromThreatList = (
  threatList: ThreatListItem[] = [],
  signalValueMap?: SignalValuesMap
): SignalMatch[] => {
  const signalMap: { [key: string]: ThreatMatchNamedQuery[] } = {};
  const addSignalValueToMap = ({
    id,
    threatHit,
    query,
  }: {
    id: string;
    threatHit: ThreatListItem;
    query: ThreatMatchNamedQuery | ThreatTermNamedQuery;
  }) => {
    if (!signalMap[id]) {
      signalMap[id] = [];
    }

    // creating map of signal with large number of threats could lead to out of memory Kibana crash
    // large number of threats also can cause signals bulk create failure due too large payload (413)
    // large number of threats significantly slower alert details page render
    // so, its number is limited to MAX_NUMBER_OF_SIGNAL_MATCHES
    // more details https://github.com/elastic/kibana/issues/143595#issuecomment-1335433592
    if (signalMap[id].length >= MAX_NUMBER_OF_SIGNAL_MATCHES) {
      return;
    }

    signalMap[id].push({
      id: threatHit._id,
      index: threatHit._index,
      field: query.field,
      value: query.value,
      queryType: '',
    });
  };
  threatList.forEach((threatHit) =>
    extractNamedQueries(threatHit).forEach((query) => {
      const signalId = query.id;

      if (query.queryType === ThreatMatchQueryType.term) {
        const threatValue = get(threatHit?._source, query.value);
        // TODO: check types
        if (threatValue && typeof threatValue === 'string' && signalValueMap) {
          const ids = signalValueMap[query.field][threatValue];

          ids.forEach((id: string) => {
            addSignalValueToMap({
              id,
              threatHit,
              query,
            });
          });
        }
      } else {
        if (!signalId) {
          return;
        }

        addSignalValueToMap({
          id: signalId,
          threatHit,
          query,
        });
      }
    })
  );

  const signalMatches = Object.entries(signalMap).map(([key, value]) => ({
    signalId: key,
    queries: value,
  }));
  // console.log('signalMatches');
  // console.log(signalMatches);
  return signalMatches;
};

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

export const enrichSignalThreatMatches = async (
  signals: SignalSourceHit[],
  getMatchedThreats: GetMatchedThreats,
  indicatorPath: string,
  signalMatchesArg?: SignalMatch[]
): Promise<SignalSourceHit[]> => {
  if (signals.length === 0) {
    return signals;
  }

  const uniqueHits = groupAndMergeSignalMatches(signals);
  const signalMatches: SignalMatch[] = signalMatchesArg
    ? signalMatchesArg
    : uniqueHits.map((signalHit) => ({
        signalId: signalHit._id,
        queries: extractNamedQueries(signalHit) as ThreatMatchNamedQuery[],
      }));

  const matchedThreatIds = [
    ...new Set(
      signalMatches
        .map((signalMatch) => signalMatch.queries)
        .flat()
        .map(({ id }) => id)
    ),
  ];
  const matchedThreats = await getMatchedThreats(matchedThreatIds);

  const enrichmentsWithoutAtomic: { [key: string]: ThreatEnrichment[] } = {};
  signalMatches.forEach((signalMatch) => {
    enrichmentsWithoutAtomic[signalMatch.signalId] = buildEnrichments({
      indicatorPath,
      queries: signalMatch.queries,
      threats: matchedThreats,
    });
  });

  const enrichedSignals: SignalSourceHit[] = uniqueHits.map((signalHit, i) => {
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
  });

  return enrichedSignals;
};
