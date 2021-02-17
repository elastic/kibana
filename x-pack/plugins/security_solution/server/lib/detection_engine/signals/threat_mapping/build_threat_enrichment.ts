/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalSearchResponse, SignalsEnrichment } from '../types';
import { enrichSignalThreatMatches } from './enrich_signal_threat_matches';
import { getThreatList } from './get_threat_list';
import { BuildThreatEnrichmentOptions, GetMatchedThreats } from './types';

const DEFAULT_INDICATOR_PATH = 'threat.indicator';

export const buildThreatEnrichment = ({
  buildRuleMessage,
  exceptionItems,
  listClient,
  logger,
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
    const threatResponse = await getThreatList({
      callCluster: services.callCluster,
      exceptionItems,
      threatFilters: [...threatFilters, matchedThreatsFilter],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      listClient,
      searchAfter: undefined,
      sortField: undefined,
      sortOrder: undefined,
      logger,
      buildRuleMessage,
      perPage: undefined,
    });

    return threatResponse.hits.hits;
  };

  const defaultedIndicatorPath = threatIndicatorPath ? threatIndicatorPath : DEFAULT_INDICATOR_PATH;
  return (signals: SignalSearchResponse): Promise<SignalSearchResponse> =>
    enrichSignalThreatMatches(signals, getMatchedThreats, defaultedIndicatorPath);
};
