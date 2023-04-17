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

export interface HostsRelatedUsersArgs {
  inspect: InspectResponse;
  totalCount: number;
  relatedUsers: RelatedUser[];
  refetch: inputsModel.Refetch;
}

interface UseHostsRelatedUsers {
  hostName: string;
  indexNames: string[];
  from: string;
  skip?: boolean;
}

export const useHostsRelatedUsers = ({
  hostName,
  indexNames,
  from,
  skip = false,
}: UseHostsRelatedUsers): [boolean, HostsRelatedUsersArgs] => {
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
    errorMessage: 'error',
    abort: skip,
  });

  const hostRelatedUsersResponse = useMemo(
    () => ({
      totalCount: response.totalCount,
      relatedUsers: response.relatedUsers,
      inspect,
      refetch,
    }),
    [inspect, refetch, response.totalCount, response.relatedUsers]
  );

  const hostRelatedUsersRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: RelatedEntitiesQueries.relatedUsers,
      hostName,
      from,
    }),
    [indexNames, from, hostName]
  );

  useEffect(() => {
    if (!skip) {
      search(hostRelatedUsersRequest);
    }
  }, [hostRelatedUsersRequest, search, skip]);

  return [loading, hostRelatedUsersResponse];
};
