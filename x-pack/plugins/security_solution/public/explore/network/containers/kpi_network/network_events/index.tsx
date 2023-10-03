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

import { isRunningResponse } from '@kbn/data-plugin/common';
import type { NetworkKpiEventsRequestOptionsInput } from '../../../../../../common/api/search_strategy';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { inputsModel } from '../../../../../common/store';
import { createFilter } from '../../../../../common/containers/helpers';
import { useKibana } from '../../../../../common/lib/kibana';
import type { NetworkKpiNetworkEventsStrategyResponse } from '../../../../../../common/search_strategy';
import { NetworkKpiQueries } from '../../../../../../common/search_strategy';
import type { ESTermQuery } from '../../../../../../common/typed_json';

import * as i18n from './translations';
import { getInspectResponse } from '../../../../../helpers';
import type { InspectResponse } from '../../../../../types';

export const ID = 'networkKpiNetworkEventsQuery';

export interface NetworkKpiNetworkEventsArgs {
  networkEvents: number;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
}

interface UseNetworkKpiNetworkEvents {
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useNetworkKpiNetworkEvents = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseNetworkKpiNetworkEvents): [boolean, NetworkKpiNetworkEventsArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [networkKpiNetworkEventsRequest, setNetworkKpiNetworkEventsRequest] =
    useState<NetworkKpiEventsRequestOptionsInput | null>(null);

  const [networkKpiNetworkEventsResponse, setNetworkKpiNetworkEventsResponse] =
    useState<NetworkKpiNetworkEventsArgs>({
      networkEvents: 0,
      id: ID,
      inspect: {
        dsl: [],
        response: [],
      },
      isInspected: false,
      refetch: refetch.current,
    });
  const { addError } = useAppToasts();

  const networkKpiNetworkEventsSearch = useCallback(
    (request: NetworkKpiEventsRequestOptionsInput | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<NetworkKpiEventsRequestOptionsInput, NetworkKpiNetworkEventsStrategyResponse>(
            request,
            {
              strategy: 'securitySolutionSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (!isRunningResponse(response)) {
                setLoading(false);
                setNetworkKpiNetworkEventsResponse((prevResponse) => ({
                  ...prevResponse,
                  networkEvents: response.networkEvents,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_NETWORK_KPI_NETWORK_EVENTS,
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
    [data.search, addError, skip]
  );

  useEffect(() => {
    setNetworkKpiNetworkEventsRequest((prevRequest) => {
      const myRequest: NetworkKpiEventsRequestOptionsInput = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkKpiQueries.networkEvents,
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
    networkKpiNetworkEventsSearch(networkKpiNetworkEventsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [networkKpiNetworkEventsRequest, networkKpiNetworkEventsSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, networkKpiNetworkEventsResponse];
};
