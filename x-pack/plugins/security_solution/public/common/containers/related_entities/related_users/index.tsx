/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { inputsModel } from '../../../store';
import type { InspectResponse } from '../../../../types';
import { RelatedEntitiesQueries } from '../../../../../common/search_strategy/security_solution/related_entities';
import type { RelatedUser } from '../../../../../common/search_strategy/security_solution/related_entities/related_users';
import { useSearchStrategy } from '../../use_search_strategy';
import { FAIL_RELATED_USERS } from './translations';
import { useIsNewRiskScoreModuleInstalled } from '../../../../entity_analytics/api/hooks/use_risk_engine_status';

export interface UseHostRelatedUsersResult {
  inspect: InspectResponse;
  totalCount: number;
  relatedUsers: RelatedUser[];
  refetch: inputsModel.Refetch;
  loading: boolean;
}

interface UseHostRelatedUsersParam {
  hostName: string;
  indexNames: string[];
  from: string;
  skip?: boolean;
}

export const useHostRelatedUsers = ({
  hostName,
  indexNames,
  from,
  skip = false,
}: UseHostRelatedUsersParam): UseHostRelatedUsersResult => {
  const { installed: isNewRiskScoreModuleInstalled, isLoading: riskScoreStatusLoading } =
    useIsNewRiskScoreModuleInstalled();
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<RelatedEntitiesQueries.relatedUsers>({
    factoryQueryType: RelatedEntitiesQueries.relatedUsers,
    initialResult: {
      totalCount: 0,
      relatedUsers: [],
    },
    errorMessage: FAIL_RELATED_USERS,
    abort: skip,
  });

  const hostRelatedUsersResponse = useMemo(
    () => ({
      inspect,
      totalCount: response.totalCount,
      relatedUsers: response.relatedUsers,
      refetch,
      loading,
    }),
    [inspect, refetch, response.totalCount, response.relatedUsers, loading]
  );

  const hostRelatedUsersRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: RelatedEntitiesQueries.relatedUsers,
      hostName,
      from,
      isNewRiskScoreModuleInstalled,
    }),
    [indexNames, from, hostName, isNewRiskScoreModuleInstalled]
  );

  useEffect(() => {
    if (!skip && !riskScoreStatusLoading) {
      search(hostRelatedUsersRequest);
    }
  }, [hostRelatedUsersRequest, riskScoreStatusLoading, search, skip]);

  return hostRelatedUsersResponse;
};
