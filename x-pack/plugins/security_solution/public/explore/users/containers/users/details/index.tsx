/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { inputsModel } from '../../../../../common/store';
import * as i18n from './translations';
import type { InspectResponse } from '../../../../../types';
import { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type { UserItem } from '../../../../../../common/search_strategy/security_solution/users/common';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';

export const ID = 'usersDetailsQuery';

export interface UserDetailsArgs {
  id: string;
  inspect: InspectResponse;
  userDetails: UserItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

interface UseUserDetails {
  endDate: string;
  userName: string;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useUserDetails = ({
  endDate,
  userName,
  indexNames,
  id = ID,
  skip = false,
  startDate,
}: UseUserDetails): [boolean, UserDetailsArgs] => {
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.details>({
    factoryQueryType: UsersQueries.details,
    initialResult: {
      userDetails: {},
    },
    errorMessage: i18n.FAIL_USER_DETAILS,
    abort: skip,
  });

  const userDetailsResponse = useMemo(
    () => ({
      endDate,
      userDetails: response.userDetails,
      id,
      inspect,
      isInspected: false,
      refetch,
      startDate,
    }),
    [endDate, id, inspect, refetch, response.userDetails, startDate]
  );

  const userDetailsRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: UsersQueries.details,
      userName,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    }),
    [endDate, indexNames, startDate, userName]
  );

  useEffect(() => {
    if (!skip) {
      search(userDetailsRequest);
    }
  }, [userDetailsRequest, search, skip]);

  return [loading, userDetailsResponse];
};
