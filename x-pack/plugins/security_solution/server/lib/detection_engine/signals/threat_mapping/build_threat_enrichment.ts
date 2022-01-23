/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';
import { SignalSearchResponse, SignalsEnrichment } from '../types';
import { enrichSignalThreatMatches } from './enrich_signal_threat_matches';
import { BuildThreatEnrichmentOptions, GetMatchedThreats } from './types';
import { getNextPage } from './get_next_page';

export const buildThreatEnrichment = ({
  exceptionItems,
  logDebugMessage,
  services,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatQuery,
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
      index: threatIndex,
      language: threatLanguage,
      logDebugMessage,
      perPage: undefined,
      query: threatQuery,
      searchAfter: undefined,
      sortOrder: 'desc',
    });

    return threatResponse.hits.hits;
  };

  const defaultedIndicatorPath = threatIndicatorPath
    ? threatIndicatorPath
    : DEFAULT_INDICATOR_SOURCE_PATH;
  return (signals: SignalSearchResponse): Promise<SignalSearchResponse> =>
    enrichSignalThreatMatches(signals, getMatchedThreats, defaultedIndicatorPath);
};
