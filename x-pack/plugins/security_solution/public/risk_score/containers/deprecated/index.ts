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
import { getRiskScoreDeprecated, RiskEntity } from './api';

interface RiskScoresDeprecated {
  error: unknown;
  isDeprecated: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  refetch: (indexName: string) => void;
}

export const useRiskScoreDeprecated = (
  isFeatureEnabled: boolean,
  factoryQueryType: RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore,
  defaultIndex?: string
): RiskScoresDeprecated => {
  const entity = useMemo(
    () => (factoryQueryType === RiskQueries.hostsRiskScore ? RiskEntity.host : RiskEntity.user),
    [factoryQueryType]
  );

  const { query, data, isLoading, error } = useQuery<Params, Response>(
    QUERY_NAMES.GET_RISK_SCORE_DEPRECATED,
    getRiskScoreDeprecated
  );

  const response = useMemo(
    // if feature is enabled, let isDeprecated = true so the actual
    // risk score fetch is not called until this check is complete
    () => (data ? data : { isDeprecated: isFeatureEnabled, isEnabled: isFeatureEnabled }),
    // isFeatureEnabled is initial state, not update requirement
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

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

  return { error, isLoading, refetch: searchDeprecated, ...response };
};
