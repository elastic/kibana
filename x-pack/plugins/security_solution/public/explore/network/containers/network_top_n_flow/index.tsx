/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';

import type { NetworkTopNFlowRequestOptionsInput } from '../../../../../common/api/search_strategy';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { inputsModel } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { createFilter } from '../../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../components/paginated_table/helpers';
import type { networkModel } from '../../store';
import { networkSelectors } from '../../store';
import type {
  FlowTargetSourceDest,
  NetworkTopNFlowEdges,
  PageInfoPaginated,
} from '../../../../../common/search_strategy';
import { NetworkQueries } from '../../../../../common/search_strategy';
import type { InspectResponse } from '../../../../types';
import * as i18n from './translations';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

export const ID = 'networkTopNFlowQuery';

export interface NetworkTopNFlowArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  networkTopNFlow: NetworkTopNFlowEdges[];
  totalCount: number;
}

interface UseNetworkTopNFlow {
  flowTarget: FlowTargetSourceDest;
  id: string;
  ip?: string;
  indexNames: string[];
  type: networkModel.NetworkType;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
}

export const useNetworkTopNFlow = ({
  endDate,
  filterQuery,
  flowTarget,
  id,
  indexNames,
  ip,
  skip,
  startDate,
  type,
}: UseNetworkTopNFlow): [boolean, NetworkTopNFlowArgs] => {
  const getTopNFlowSelector = useMemo(() => networkSelectors.topNFlowSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) =>
    getTopNFlowSelector(state, type, flowTarget)
  );

  const [networkTopNFlowRequest, setTopNFlowRequest] =
    useState<NetworkTopNFlowRequestOptionsInput | null>(null);

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setTopNFlowRequest((prevRequest) => {
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
  } = useSearchStrategy<NetworkQueries.topNFlow>({
    factoryQueryType: NetworkQueries.topNFlow,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.FAIL_NETWORK_TOP_N_FLOW,
    abort: skip,
  });

  const networkTopNFlowResponse = useMemo(
    () => ({
      endDate,
      networkTopNFlow: response.edges,
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
    setTopNFlowRequest((prevRequest) => {
      const myRequest: NetworkTopNFlowRequestOptionsInput = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkQueries.topNFlow,
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
  }, [activePage, endDate, filterQuery, indexNames, ip, limit, startDate, sort, flowTarget]);

  useEffect(() => {
    if (!skip && networkTopNFlowRequest) {
      search(networkTopNFlowRequest);
    }
  }, [networkTopNFlowRequest, search, skip]);

  return [loading, networkTopNFlowResponse];
};
