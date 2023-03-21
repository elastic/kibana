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
import { networkSelectors } from '../../store';
import type {
  NetworkDnsRequestOptions,
  NetworkDnsEdges,
  PageInfoPaginated,
} from '../../../../../common/search_strategy';
import { NetworkQueries } from '../../../../../common/search_strategy';
import * as i18n from './translations';
import type { InspectResponse } from '../../../../types';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

export const ID = 'networkDnsQuery';

export interface NetworkDnsResponse {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  networkDns: NetworkDnsEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  stackByField?: string;
  totalCount: number;
}

interface UseNetworkDns {
  id: string;
  indexNames: string[];
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
}

export const useNetworkDns = ({
  endDate,
  filterQuery,
  id,
  indexNames,
  skip,
  startDate,
}: UseNetworkDns): [boolean, NetworkDnsResponse] => {
  const getNetworkDnsSelector = useMemo(() => networkSelectors.dnsSelector(), []);
  const { activePage, sort, isPtrIncluded, limit } = useDeepEqualSelector(getNetworkDnsSelector);

  const [networkDnsRequest, setNetworkDnsRequest] = useState<NetworkDnsRequestOptions | null>(null);

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

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<NetworkQueries.dns>({
    factoryQueryType: NetworkQueries.dns,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.ERROR_NETWORK_DNS,
    abort: skip,
  });

  const networkDnsResponse = useMemo(
    () => ({
      id,
      inspect,
      isInspected: false,
      loadPage: wrappedLoadMore,
      networkDns: response.edges,
      pageInfo: response.pageInfo,
      refetch,
      totalCount: response.totalCount,
    }),
    [id, inspect, refetch, response.edges, response.pageInfo, response.totalCount, wrappedLoadMore]
  );

  useEffect(() => {
    setNetworkDnsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        isPtrIncluded,
        factoryQueryType: NetworkQueries.dns,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit, true),
        sort,
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
  }, [activePage, indexNames, endDate, filterQuery, limit, startDate, sort, isPtrIncluded]);

  useEffect(() => {
    if (!skip && networkDnsRequest) {
      search(networkDnsRequest);
    }
  }, [networkDnsRequest, search, skip]);

  return [loading, networkDnsResponse];
};
