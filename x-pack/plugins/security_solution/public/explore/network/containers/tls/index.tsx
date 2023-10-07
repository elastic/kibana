/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';

import type { NetworkTlsRequestOptionsInput } from '../../../../../common/api/search_strategy';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { inputsModel } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { createFilter } from '../../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../components/paginated_table/helpers';
import type { networkModel } from '../../store';
import { networkSelectors } from '../../store';
import type { NetworkTlsStrategyResponse } from '../../../../../common/search_strategy/security_solution/network';
import { NetworkQueries } from '../../../../../common/search_strategy/security_solution/network';

import * as i18n from './translations';
import type {
  FlowTargetSourceDest,
  PageInfoPaginated,
} from '../../../../../common/search_strategy';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

export const ID = 'networkTlsQuery';

export interface NetworkTlsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  tls: NetworkTlsStrategyResponse['edges'];
  totalCount: number;
}

interface UseNetworkTls {
  flowTarget: FlowTargetSourceDest;
  indexNames: string[];
  ip: string;
  type: networkModel.NetworkType;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
  id: string;
}

export const useNetworkTls = ({
  endDate,
  filterQuery,
  flowTarget,
  id,
  indexNames,
  ip,
  skip,
  startDate,
  type,
}: UseNetworkTls): [boolean, NetworkTlsArgs] => {
  const getTlsSelector = useMemo(() => networkSelectors.tlsSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) => getTlsSelector(state, type));

  const [networkTlsRequest, setNetworkTlsRequest] = useState<NetworkTlsRequestOptionsInput | null>(
    null
  );

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setNetworkTlsRequest((prevRequest) => {
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
  } = useSearchStrategy<NetworkQueries.tls>({
    factoryQueryType: NetworkQueries.tls,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.FAIL_NETWORK_TLS,
    abort: skip,
  });

  const networkTlsResponse = useMemo(
    () => ({
      endDate,
      tls: response.edges,
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
    setNetworkTlsRequest((prevRequest) => {
      const myRequest: NetworkTlsRequestOptionsInput = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkQueries.tls,
        filterQuery: createFilter(filterQuery),
        flowTarget,
        ip,
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, indexNames, endDate, filterQuery, limit, startDate, sort, flowTarget, ip, id]);

  useEffect(() => {
    if (!skip && networkTlsRequest) {
      search(networkTlsRequest);
    }
  }, [networkTlsRequest, search, skip]);

  return [loading, networkTlsResponse];
};
