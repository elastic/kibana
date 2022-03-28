/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { Subscription } from 'rxjs';

import {
  NetworkQueries,
  NetworkOverviewRequestOptions,
  NetworkOverviewStrategyResponse,
} from '../../../../common/search_strategy/security_solution';
import { useKibana } from '../../../common/lib/kibana';
import { inputsModel } from '../../../common/store/inputs';
import { createFilter } from '../../../common/containers/helpers';
import { ESQuery } from '../../../../common/typed_json';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import * as i18n from './translations';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const ID = 'overviewNetworkQuery';

export interface NetworkOverviewArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  overviewNetwork: NetworkOverviewStrategyResponse['overviewNetwork'];
  refetch: inputsModel.Refetch;
}

interface UseNetworkOverview {
  filterQuery?: ESQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useNetworkOverview = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseNetworkOverview): [boolean, NetworkOverviewArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [overviewNetworkRequest, setNetworkRequest] =
    useState<NetworkOverviewRequestOptions | null>(null);

  const [overviewNetworkResponse, setNetworkOverviewResponse] = useState<NetworkOverviewArgs>({
    overviewNetwork: {},
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
  });
  const { addError, addWarning } = useAppToasts();

  const overviewNetworkSearch = useCallback(
    (request: NetworkOverviewRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<NetworkOverviewRequestOptions, NetworkOverviewStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setNetworkOverviewResponse((prevResponse) => ({
                  ...prevResponse,
                  overviewNetwork: response.overviewNetwork,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_NETWORK_OVERVIEW);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_NETWORK_OVERVIEW,
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
    setNetworkRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkQueries.overview,
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
    overviewNetworkSearch(overviewNetworkRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [overviewNetworkRequest, overviewNetworkSearch]);

  useEffect(() => {
    if (skip) {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, overviewNetworkResponse];
};
