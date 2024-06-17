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
import { NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy/security_solution/users/common';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';

export const OBSERVED_USER_QUERY_ID = 'observedUsersDetailsQuery';

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

export const useObservedUserDetails = ({
  endDate,
  userName,
  indexNames,
  id = OBSERVED_USER_QUERY_ID,
  skip = false,
  startDate,
}: UseUserDetails): [boolean, UserDetailsArgs] => {
  const expandableFlyoutDisabled = useIsExperimentalFeatureEnabled('expandableFlyoutDisabled');
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.observedDetails>({
    factoryQueryType: UsersQueries.observedDetails,
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
      refetch,
      startDate,
    }),
    [endDate, id, inspect, refetch, response.userDetails, startDate]
  );

  const userDetailsRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: UsersQueries.observedDetails,
      userName,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
      filterQuery: !expandableFlyoutDisabled ? NOT_EVENT_KIND_ASSET_FILTER : undefined,
    }),
    [endDate, indexNames, startDate, userName, expandableFlyoutDisabled]
  );

  useEffect(() => {
    if (!skip) {
      search(userDetailsRequest);
    }
  }, [userDetailsRequest, search, skip]);

  return [loading, userDetailsResponse];
};
