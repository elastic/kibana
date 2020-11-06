/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useState, useEffect, useCallback, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

import { ESTermQuery } from '../../../../common/typed_json';
import { inputsModel } from '../../../common/store';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useKibana } from '../../../common/lib/kibana';
import { createFilter } from '../../../common/containers/helpers';
import { NetworkDnsEdges, PageInfoPaginated } from '../../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { networkModel, networkSelectors } from '../../store';
import {
  NetworkQueries,
  NetworkDnsRequestOptions,
  NetworkDnsStrategyResponse,
  MatrixOverOrdinalHistogramData,
} from '../../../../common/search_strategy/security_solution/network';
import {
  AbortError,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/common';
import * as i18n from './translations';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';

export * from './histogram';

const ID = 'networkDnsQuery';

export interface NetworkDnsArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  networkDns: NetworkDnsEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  stackByField?: string;
  totalCount: number;
  histogram: MatrixOverOrdinalHistogramData[];
}

interface UseNetworkDns {
  id?: string;
  indexNames: string[];
  type: networkModel.NetworkType;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
}

export const useNetworkDns = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  type,
}: UseNetworkDns): [boolean, NetworkDnsArgs] => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const { activePage, sort, isPtrIncluded, limit } = useShallowEqualSelector(getNetworkDnsSelector);
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);

  const [networkDnsRequest, setNetworkDnsRequest] = useState<NetworkDnsRequestOptions | null>(
    !skip
      ? {
          defaultIndex: indexNames,
          factoryQueryType: NetworkQueries.dns,
          filterQuery: createFilter(filterQuery),
          isPtrIncluded,
          pagination: generateTablePaginationOptions(activePage, limit),
          sort,
          timerange: {
            interval: '12h',
            from: startDate ? startDate : '',
            to: endDate ? endDate : new Date(Date.now()).toISOString(),
          },
        }
      : null
  );

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setNetworkDnsRequest((prevRequest) => {
        if (!prevRequest) {
          return prevRequest;
        }

        return {
          ...prevRequest,
          pagination: generateTablePaginationOptions(newActivePage, limit),
        };
      });
    },
    [limit]
  );

  const [networkDnsResponse, setNetworkDnsResponse] = useState<NetworkDnsArgs>({
    networkDns: [],
    histogram: [],
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    loadPage: wrappedLoadMore,
    pageInfo: {
      activePage: 0,
      fakeTotalCount: 0,
      showMorePagesIndicator: false,
    },
    refetch: refetch.current,
    totalCount: -1,
  });

  const networkDnsSearch = useCallback(
    (request: NetworkDnsRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkDnsRequestOptions, NetworkDnsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkDnsResponse((prevResponse) => ({
                    ...prevResponse,
                    networkDns: response.edges,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    pageInfo: response.pageInfo,
                    refetch: refetch.current,
                    totalCount: response.totalCount,
                    histogram: response.histogram ?? prevResponse.histogram,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_DNS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_DNS,
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
    setNetworkDnsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        isPtrIncluded,
        factoryQueryType: NetworkQueries.dns,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        sort,
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
  }, [activePage, indexNames, endDate, filterQuery, limit, startDate, sort, skip, isPtrIncluded]);

  useEffect(() => {
    networkDnsSearch(networkDnsRequest);
  }, [networkDnsRequest, networkDnsSearch]);

  return [loading, networkDnsResponse];
};
