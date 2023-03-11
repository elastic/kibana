/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';

import type { ESTermQuery } from '../../../../../common/typed_json';
import type { inputsModel } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { createFilter } from '../../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../components/paginated_table/helpers';
import type { networkModel } from '../../store';
import { networkSelectors } from '../../store';
import type {
  NetworkHttpEdges,
  PageInfoPaginated,
  NetworkHttpRequestOptions,
  SortField,
} from '../../../../../common/search_strategy';
import { NetworkQueries } from '../../../../../common/search_strategy';
import * as i18n from './translations';
import type { InspectResponse } from '../../../../types';

import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

export const ID = 'networkHttpQuery';

export interface NetworkHttpArgs {
  id: string;
  inspect: InspectResponse;
  ip?: string;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  networkHttp: NetworkHttpEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

interface UseNetworkHttp {
  endDate: string;
  filterQuery?: ESTermQuery | string;
  id: string;
  indexNames: string[];
  ip?: string;
  skip: boolean;
  startDate: string;
  type: networkModel.NetworkType;
}

export const useNetworkHttp = ({
  endDate,
  filterQuery,
  id,
  indexNames,
  ip,
  skip,
  startDate,
  type,
}: UseNetworkHttp): [boolean, NetworkHttpArgs] => {
  const getHttpSelector = useMemo(() => networkSelectors.httpSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) => getHttpSelector(state, type));

  const [networkHttpRequest, setHostRequest] = useState<NetworkHttpRequestOptions | null>(null);

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

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<NetworkQueries.http>({
    factoryQueryType: NetworkQueries.http,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.FAIL_NETWORK_HTTP,
    abort: skip,
  });

  const networkHttpResponse = useMemo(
    () => ({
      endDate,
      networkHttp: response.edges,
      id,
      inspect,
      isInspected: false,
      loadPage: wrappedLoadMore,
      pageInfo: response.pageInfo,
      refetch,
      startDate,
      totalCount: response.totalCount,
    }),
    [
      endDate,
      id,
      inspect,
      refetch,
      response.edges,
      response.pageInfo,
      response.totalCount,
      startDate,
      wrappedLoadMore,
    ]
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
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, indexNames, endDate, filterQuery, ip, limit, startDate, sort]);

  useEffect(() => {
    if (!skip && networkHttpRequest) {
      search(networkHttpRequest);
    }
  }, [networkHttpRequest, search, skip]);

  return [loading, networkHttpResponse];
};
