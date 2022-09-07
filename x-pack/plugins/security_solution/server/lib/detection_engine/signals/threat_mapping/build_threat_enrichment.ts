/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalsEnrichment } from '../types';
import { enrichSignalThreatMatches } from './enrich_signal_threat_matches';
import type { BuildThreatEnrichmentOptions, GetMatchedThreats } from './types';
import { getThreatList } from './get_threat_list';

export const buildThreatEnrichment = ({
  ruleExecutionLogger,
  services,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatQuery,
  pitId,
  reassignPitId,
  listClient,
  exceptionFilter,
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
      esClient: services.scopedClusterClient.asCurrentUser,
      index: threatIndex,
      language: threatLanguage,
      perPage: undefined,
      query: threatQuery,
      ruleExecutionLogger,
      searchAfter: undefined,
      threatFilters: [...threatFilters, matchedThreatsFilter],
      threatListConfig: {
        _source: [`${threatIndicatorPath}.*`, 'threat.feed.*'],
        fields: undefined,
      },
      pitId,
      reassignPitId,
      runtimeMappings: undefined,
      listClient,
      exceptionFilter,
    });

    return threatResponse.hits.hits;
  };

  return (signals) => enrichSignalThreatMatches(signals, getMatchedThreats, threatIndicatorPath);
};
