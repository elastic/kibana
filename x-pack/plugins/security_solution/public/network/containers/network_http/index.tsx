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
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { networkModel, networkSelectors } from '../../store';
import {
  NetworkQueries,
  NetworkHttpEdges,
  PageInfoPaginated,
  NetworkHttpRequestOptions,
  NetworkHttpStrategyResponse,
  SortField,
} from '../../../../common/search_strategy';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';
import * as i18n from './translations';
import { InspectResponse } from '../../../types';
import { getInspectResponse } from '../../../helpers';

const ID = 'networkHttpQuery';

export interface NetworkHttpArgs {
  id: string;
  ip?: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  networkHttp: NetworkHttpEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

interface UseNetworkHttp {
  id?: string;
  ip?: string;
  indexNames: string[];
  type: networkModel.NetworkType;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
}

export const useNetworkHttp = ({
  endDate,
  filterQuery,
  id = ID,
  indexNames,
  ip,
  skip,
  startDate,
  type,
}: UseNetworkHttp): [boolean, NetworkHttpArgs] => {
  const getHttpSelector = networkSelectors.httpSelector();
  const { activePage, limit, sort } = useShallowEqualSelector((state) =>
    getHttpSelector(state, type)
  );
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);

  const [networkHttpRequest, setHostRequest] = useState<NetworkHttpRequestOptions | null>(
    !skip
      ? {
          defaultIndex: indexNames,
          factoryQueryType: NetworkQueries.http,
          filterQuery: createFilter(filterQuery),
          ip,
          pagination: generateTablePaginationOptions(activePage, limit),
          sort: sort as SortField,
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
      setHostRequest((prevRequest) => {
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

  const [networkHttpResponse, setNetworkHttpResponse] = useState<NetworkHttpArgs>({
    networkHttp: [],
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

  const networkHttpSearch = useCallback(
    (request: NetworkHttpRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkHttpRequestOptions, NetworkHttpStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkHttpResponse((prevResponse) => ({
                    ...prevResponse,
                    networkHttp: response.edges,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    pageInfo: response.pageInfo,
                    refetch: refetch.current,
                    totalCount: response.totalCount,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_HTTP);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_HTTP,
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
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkQueries.http,
        filterQuery: createFilter(filterQuery),
        ip,
        pagination: generateTablePaginationOptions(activePage, limit),
        sort: sort as SortField,
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
  }, [activePage, indexNames, endDate, filterQuery, ip, limit, startDate, sort, skip]);

  useEffect(() => {
    networkHttpSearch(networkHttpRequest);
  }, [networkHttpRequest, networkHttpSearch]);

  return [loading, networkHttpResponse];
};
