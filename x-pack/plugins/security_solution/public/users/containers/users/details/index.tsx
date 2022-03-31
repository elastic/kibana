/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { inputsModel } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';

import * as i18n from './translations';
import {
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';
import {
  UserDetailsRequestOptions,
  UserDetailsStrategyResponse,
} from '../../../../../common/search_strategy/security_solution/users/details';
import { UsersQueries } from '../../../../../common/search_strategy/security_solution/users';
import { UserItem } from '../../../../../common/search_strategy/security_solution/users/common';

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
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [userDetailsRequest, setUserDetailsRequest] = useState<UserDetailsRequestOptions | null>(
    null
  );
  const { addError, addWarning } = useAppToasts();

  const [userDetailsResponse, setUserDetailsResponse] = useState<UserDetailsArgs>({
    endDate,
    userDetails: {},
    id,
    inspect: {
      dsl: [],
      response: [],
    },
    refetch: refetch.current,
    startDate,
  });

  const userDetailsSearch = useCallback(
    (request: UserDetailsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<UserDetailsRequestOptions, UserDetailsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setUserDetailsResponse((prevResponse) => ({
                  ...prevResponse,
                  userDetails: response.userDetails,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_USER_DETAILS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_USER_DETAILS,
              });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning, skip]
  );

  useEffect(() => {
    setUserDetailsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: UsersQueries.details,
        userName,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [endDate, userName, indexNames, startDate]);

  useEffect(() => {
    userDetailsSearch(userDetailsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [userDetailsRequest, userDetailsSearch]);

  return [loading, userDetailsResponse];
};
