/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';

import { inputsModel } from '../../../../common/store';
import { createFilter } from '../../../../common/containers/helpers';
import { useKibana } from '../../../../common/lib/kibana';
import {
  NetworkKpiQueries,
  NetworkKpiNetworkEventsRequestOptions,
  NetworkKpiNetworkEventsStrategyResponse,
} from '../../../../../common/search_strategy';
import { ESTermQuery } from '../../../../../common/typed_json';

import * as i18n from './translations';
import {
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

const ID = 'networkKpiNetworkEventsQuery';

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
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [
    networkKpiNetworkEventsRequest,
    setNetworkKpiNetworkEventsRequest,
  ] = useState<NetworkKpiNetworkEventsRequestOptions | null>(
    !skip
      ? {
          defaultIndex: indexNames,
          factoryQueryType: NetworkKpiQueries.networkEvents,
          filterQuery: createFilter(filterQuery),
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
        }
      : null
  );

  const [networkKpiNetworkEventsResponse, setNetworkKpiNetworkEventsResponse] = useState<
    NetworkKpiNetworkEventsArgs
  >({
    networkEvents: 0,
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
  });

  const networkKpiNetworkEventsSearch = useCallback(
    (request: NetworkKpiNetworkEventsRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkKpiNetworkEventsRequestOptions, NetworkKpiNetworkEventsStrategyResponse>(
            request,
            {
              strategy: 'securitySolutionSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkKpiNetworkEventsResponse((prevResponse) => ({
                    ...prevResponse,
                    networkEvents: response.networkEvents,
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
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_KPI_NETWORK_EVENTS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_KPI_NETWORK_EVENTS,
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
    setNetworkKpiNetworkEventsRequest((prevRequest) => {
      const myRequest = {
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
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, endDate, filterQuery, skip, startDate]);

  useEffect(() => {
    networkKpiNetworkEventsSearch(networkKpiNetworkEventsRequest);
  }, [networkKpiNetworkEventsRequest, networkKpiNetworkEventsSearch]);

  return [loading, networkKpiNetworkEventsResponse];
};
