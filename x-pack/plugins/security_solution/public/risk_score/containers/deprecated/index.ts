/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { QUERY_NAMES, useQuery } from '../../../common/hooks/use_query';
import { RiskQueries } from '../../../../common/search_strategy';
import type { Params, Response } from './api';
import { getRiskScoreDeprecated } from './api';

export const useRiskScoreDeprecated = (
  isFeatureEnabled: boolean,
  factoryQueryType: RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore,
  defaultIndex?: string
) => {
  const entity = useMemo(
    () => (factoryQueryType === RiskQueries.hostsRiskScore ? 'host' : 'user'),
    [factoryQueryType]
  );

  const { query, data, isLoading, error } = useQuery<Params, Response>(
    QUERY_NAMES.GET_RISK_SCORE_DEPRECATED,
    getRiskScoreDeprecated
  );

  const response = useMemo(() => (data ? data : { isDeprecated: false, isEnabled: false }), [data]);

  const searchDeprecated = useCallback(
    (indexName: string) => {
      query({
        query: { indexName, entity },
      });
    },
    [entity, query]
  );

  useEffect(() => {
    if (isFeatureEnabled && defaultIndex != null) {
      searchDeprecated(defaultIndex);
    }
  }, [isFeatureEnabled, defaultIndex, searchDeprecated]);

  return { isLoading, ...response, refetch: searchDeprecated, error };
};
