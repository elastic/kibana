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

import type { AuthenticationsKpiRequestOptionsInput } from '../../../../../../common/api/search_strategy';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { inputsModel } from '../../../../../common/store';
import { createFilter } from '../../../../../common/containers/helpers';
import { useKibana } from '../../../../../common/lib/kibana';
import type { UsersKpiAuthenticationsStrategyResponse } from '../../../../../../common/search_strategy';
import { UsersQueries } from '../../../../../../common/search_strategy';
import type { ESTermQuery } from '../../../../../../common/typed_json';

import * as i18n from './translations';
import { getInspectResponse } from '../../../../../helpers';
import type { InspectResponse } from '../../../../../types';

export const ID = 'usersKpiAuthenticationsQuery';

export interface UsersKpiAuthenticationsArgs
  extends Omit<UsersKpiAuthenticationsStrategyResponse, 'rawResponse'> {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
}

interface UseUsersKpiAuthentications {
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useUsersKpiAuthentications = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseUsersKpiAuthentications): [boolean, UsersKpiAuthenticationsArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [usersKpiAuthenticationsRequest, setUsersKpiAuthenticationsRequest] =
    useState<AuthenticationsKpiRequestOptionsInput | null>(null);

  const [usersKpiAuthenticationsResponse, setUsersKpiAuthenticationsResponse] =
    useState<UsersKpiAuthenticationsArgs>({
      authenticationsSuccess: 0,
      authenticationsSuccessHistogram: [],
      authenticationsFailure: 0,
      authenticationsFailureHistogram: [],
      id: ID,
      inspect: {
        dsl: [],
        response: [],
      },
      isInspected: false,
      refetch: refetch.current,
    });
  const { addError, addWarning } = useAppToasts();

  const usersKpiAuthenticationsSearch = useCallback(
    (request: AuthenticationsKpiRequestOptionsInput | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<AuthenticationsKpiRequestOptionsInput, UsersKpiAuthenticationsStrategyResponse>(
            request,
            {
              strategy: 'securitySolutionSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                setLoading(false);
                setUsersKpiAuthenticationsResponse((prevResponse) => ({
                  ...prevResponse,
                  authenticationsSuccess: response.authenticationsSuccess,
                  authenticationsSuccessHistogram: response.authenticationsSuccessHistogram,
                  authenticationsFailure: response.authenticationsFailure,
                  authenticationsFailureHistogram: response.authenticationsFailureHistogram,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                setLoading(false);
                addWarning(i18n.ERROR_USERS_KPI_AUTHENTICATIONS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_USERS_KPI_AUTHENTICATIONS,
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
    setUsersKpiAuthenticationsRequest((prevRequest) => {
      const myRequest: AuthenticationsKpiRequestOptionsInput = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: UsersQueries.kpiAuthentications,
        filterQuery: createFilter(filterQuery),
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
  }, [indexNames, endDate, filterQuery, startDate]);

  useEffect(() => {
    usersKpiAuthenticationsSearch(usersKpiAuthenticationsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [usersKpiAuthenticationsRequest, usersKpiAuthenticationsSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, usersKpiAuthenticationsResponse];
};
