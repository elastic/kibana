/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { inputsModel } from '../../../../common/store';
import { createFilter } from '../../../../common/containers/helpers';
import { useKibana } from '../../../../common/lib/kibana';
import {
  NetworkKpiQueries,
  NetworkKpiTlsHandshakesRequestOptions,
  NetworkKpiTlsHandshakesStrategyResponse,
} from '../../../../../common/search_strategy';
import { ESTermQuery } from '../../../../../common/typed_json';

import * as i18n from './translations';
import { AbortError } from '../../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

const ID = 'networkKpiTlsHandshakesQuery';

export interface NetworkKpiTlsHandshakesArgs {
  tlsHandshakes: number;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
}

interface UseNetworkKpiTlsHandshakes {
  filterQuery?: ESTermQuery | string;
  endDate: string;
  skip?: boolean;
  startDate: string;
}

export const useNetworkKpiTlsHandshakes = ({
  filterQuery,
  endDate,
  skip = false,
  startDate,
}: UseNetworkKpiTlsHandshakes): [boolean, NetworkKpiTlsHandshakesArgs] => {
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);
  const [networkKpiTlsHandshakesRequest, setNetworkKpiTlsHandshakesRequest] = useState<
    NetworkKpiTlsHandshakesRequestOptions
  >({
    defaultIndex,
    factoryQueryType: NetworkKpiQueries.tlsHandshakes,
    filterQuery: createFilter(filterQuery),
    id: ID,
    timerange: {
      interval: '12h',
      from: startDate,
      to: endDate,
    },
  });

  const [networkKpiTlsHandshakesResponse, setNetworkKpiTlsHandshakesResponse] = useState<
    NetworkKpiTlsHandshakesArgs
  >({
    tlsHandshakes: 0,
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
  });

  const networkKpiTlsHandshakesSearch = useCallback(
    (request: NetworkKpiTlsHandshakesRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkKpiTlsHandshakesRequestOptions, NetworkKpiTlsHandshakesStrategyResponse>(
            request,
            {
              strategy: 'securitySolutionSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkKpiTlsHandshakesResponse((prevResponse) => ({
                    ...prevResponse,
                    tlsHandshakes: response.tlsHandshakes,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    refetch: refetch.current,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_KPI_DNS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_KPI_DNS,
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
    setNetworkKpiTlsHandshakesRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
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
  }, [defaultIndex, endDate, filterQuery, skip, startDate]);

  useEffect(() => {
    networkKpiTlsHandshakesSearch(networkKpiTlsHandshakesRequest);
  }, [networkKpiTlsHandshakesRequest, networkKpiTlsHandshakesSearch]);

  return [loading, networkKpiTlsHandshakesResponse];
};
