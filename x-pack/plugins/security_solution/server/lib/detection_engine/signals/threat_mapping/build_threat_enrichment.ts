/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalSearchResponse, SignalsEnrichment } from '../types';
import { enrichSignalThreatMatches } from './enrich_signal_threat_matches';
import { BuildThreatEnrichmentOptions, GetMatchedThreats } from './types';
import { getThreatList } from './get_threat_list';

export const buildThreatEnrichment = ({
  exceptionItems,
  logDebugMessage,
  services,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatQuery,
  pitId,
  reassignPitId,
}: BuildThreatEnrichmentOptions): SignalsEnrichment => {
  const getMatchedThreats: GetMatchedThreats = async (ids) => {
    const matchedThreatsFilter = {
      query: {
        bool: {
          filter: {
            ids: { values: ids },
          },
        },
      },
    };
    const threatResponse = await getNextPage({
      abortableEsClient: services.search.asCurrentUser,
      exceptionItems,
      filters: [...threatFilters, matchedThreatsFilter],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      searchAfter: undefined,
      logDebugMessage,
      perPage: undefined,
      threatListConfig: {
        _source: [`${threatIndicatorPath}.*`, 'threat.feed.*'],
        fields: undefined,
      },
      pitId,
      reassignPitId,
    });

    return threatResponse.hits.hits;
  };

  return (signals: SignalSearchResponse): Promise<SignalSearchResponse> =>
    enrichSignalThreatMatches(signals, getMatchedThreats, threatIndicatorPath);
};
