/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import deepEqual from 'fast-deep-equal';
import { Subscription } from 'rxjs';

import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import { ESTermQuery } from '../../../../common/typed_json';
import { inputsModel } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
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
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import * as i18n from './translations';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

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
  const getTopNFlowSelector = useMemo(() => networkSelectors.topNFlowSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) =>
    getTopNFlowSelector(state, type, flowTarget)
  );
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);

  const [networkTopNFlowRequest, setTopNFlowRequest] =
    useState<NetworkTopNFlowRequestOptions | null>(null);

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
  const { addError, addWarning } = useAppToasts();

  const networkTopNFlowSearch = useCallback(
    (request: NetworkTopNFlowRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<NetworkTopNFlowRequestOptions, NetworkTopNFlowStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setNetworkTopNFlowResponse((prevResponse) => ({
                  ...prevResponse,
                  networkTopNFlow: response.edges,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  pageInfo: response.pageInfo,
                  refetch: refetch.current,
                  totalCount: response.totalCount,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_NETWORK_TOP_N_FLOW);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_NETWORK_TOP_N_FLOW,
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
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, endDate, filterQuery, indexNames, ip, limit, startDate, sort, flowTarget]);

  useEffect(() => {
    networkTopNFlowSearch(networkTopNFlowRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [networkTopNFlowRequest, networkTopNFlowSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, networkTopNFlowResponse];
};
