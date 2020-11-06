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
  FlowTargetSourceDest,
  NetworkQueries,
  NetworkTopNFlowEdges,
  NetworkTopNFlowRequestOptions,
  NetworkTopNFlowStrategyResponse,
  PageInfoPaginated,
} from '../../../../common/search_strategy';
import {
  AbortError,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import * as i18n from './translations';

const ID = 'networkTopNFlowQuery';

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
  indexNames,
  ip,
  skip,
  startDate,
  type,
}: UseNetworkTopNFlow): [boolean, NetworkTopNFlowArgs] => {
  const getTopNFlowSelector = networkSelectors.topNFlowSelector();
  const { activePage, limit, sort } = useShallowEqualSelector((state) =>
    getTopNFlowSelector(state, type, flowTarget)
  );
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);

  const [
    networkTopNFlowRequest,
    setTopNFlowRequest,
  ] = useState<NetworkTopNFlowRequestOptions | null>(
    !skip
      ? {
          defaultIndex: indexNames,
          factoryQueryType: NetworkQueries.topNFlow,
          filterQuery: createFilter(filterQuery),
          flowTarget,
          ip,
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

  const [networkTopNFlowResponse, setNetworkTopNFlowResponse] = useState<NetworkTopNFlowArgs>({
    networkTopNFlow: [],
    id: `${ID}-${flowTarget}`,
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

  const networkTopNFlowSearch = useCallback(
    (request: NetworkTopNFlowRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkTopNFlowRequestOptions, NetworkTopNFlowStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkTopNFlowResponse((prevResponse) => ({
                    ...prevResponse,
                    networkTopNFlow: response.edges,
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
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_TOP_N_FLOW);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_TOP_N_FLOW,
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
    setTopNFlowRequest((prevRequest) => {
      const myRequest = {
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
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, endDate, filterQuery, indexNames, ip, limit, startDate, sort, skip, flowTarget]);

  useEffect(() => {
    networkTopNFlowSearch(networkTopNFlowRequest);
  }, [networkTopNFlowRequest, networkTopNFlowSearch]);

  return [loading, networkTopNFlowResponse];
};
