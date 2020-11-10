/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import {
  NetworkQueries,
  NetworkOverviewRequestOptions,
  NetworkOverviewStrategyResponse,
} from '../../../../common/search_strategy/security_solution';
import { useKibana } from '../../../common/lib/kibana';
import { inputsModel } from '../../../common/store/inputs';
import { createFilter } from '../../../common/containers/helpers';
import { ESQuery } from '../../../../common/typed_json';
import {
  AbortError,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import * as i18n from './translations';

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
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [
    overviewNetworkRequest,
    setNetworkRequest,
  ] = useState<NetworkOverviewRequestOptions | null>(
    !skip
      ? {
          defaultIndex: indexNames,
          factoryQueryType: NetworkQueries.overview,
          filterQuery: createFilter(filterQuery),
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
        }
      : null
  );

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

  const overviewNetworkSearch = useCallback(
    (request: NetworkOverviewRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkOverviewRequestOptions, NetworkOverviewStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkOverviewResponse((prevResponse) => ({
                    ...prevResponse,
                    overviewNetwork: response.overviewNetwork,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    refetch: refetch.current,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_OVERVIEW);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_OVERVIEW,
                  text: msg.message,
                });
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts]
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
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, endDate, filterQuery, skip, startDate]);

  useEffect(() => {
    overviewNetworkSearch(overviewNetworkRequest);
  }, [overviewNetworkRequest, overviewNetworkSearch]);

  return [loading, overviewNetworkResponse];
};
