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

import { useTransforms } from '../../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
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
import {
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

export const ID = 'networkKpiTlsHandshakesQuery';

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
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useNetworkKpiTlsHandshakes = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseNetworkKpiTlsHandshakes): [boolean, NetworkKpiTlsHandshakesArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [networkKpiTlsHandshakesRequest, setNetworkKpiTlsHandshakesRequest] =
    useState<NetworkKpiTlsHandshakesRequestOptions | null>(null);
  const { getTransformChangesIfTheyExist } = useTransforms();

  const [networkKpiTlsHandshakesResponse, setNetworkKpiTlsHandshakesResponse] =
    useState<NetworkKpiTlsHandshakesArgs>({
      tlsHandshakes: 0,
      id: ID,
      inspect: {
        dsl: [],
        response: [],
      },
      isInspected: false,
      refetch: refetch.current,
    });
  const { addError, addWarning } = useAppToasts();

  const networkKpiTlsHandshakesSearch = useCallback(
    (request: NetworkKpiTlsHandshakesRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<NetworkKpiTlsHandshakesRequestOptions, NetworkKpiTlsHandshakesStrategyResponse>(
            request,
            {
              strategy: 'securitySolutionSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setNetworkKpiTlsHandshakesResponse((prevResponse) => ({
                  ...prevResponse,
                  tlsHandshakes: response.tlsHandshakes,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_NETWORK_KPI_TLS_HANDSHAKES);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_NETWORK_KPI_TLS_HANDSHAKES,
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
    setNetworkKpiTlsHandshakesRequest((prevRequest) => {
      const { indices, factoryQueryType, timerange } = getTransformChangesIfTheyExist({
        factoryQueryType: NetworkKpiQueries.tlsHandshakes,
        indices: indexNames,
        filterQuery,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      });

      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indices,
        factoryQueryType,
        filterQuery: createFilter(filterQuery),
        timerange,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, endDate, filterQuery, startDate, getTransformChangesIfTheyExist]);

  useEffect(() => {
    networkKpiTlsHandshakesSearch(networkKpiTlsHandshakesRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [networkKpiTlsHandshakesRequest, networkKpiTlsHandshakesSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, networkKpiTlsHandshakesResponse];
};
