/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useState, useEffect, useCallback, useRef } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { ESTermQuery } from '../../../../common/typed_json';
import { inputsModel, State } from '../../../common/store';
import { useKibana } from '../../../common/lib/kibana';
import { createFilter } from '../../../common/containers/helpers';
import { PageInfoPaginated, FlowTargetSourceDest } from '../../../graphql/types';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { networkModel, networkSelectors } from '../../store';
import {
  NetworkQueries,
  NetworkTlsRequestOptions,
  NetworkTlsStrategyResponse,
} from '../../../../common/search_strategy/security_solution/network';
import {
  AbortError,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/common';

import * as i18n from './translations';
import { getInspectResponse } from '../../../helpers';

const ID = 'networkTlsQuery';

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
  id?: string;
}

export const useNetworkTls = ({
  endDate,
  filterQuery,
  flowTarget,
  id = ID,
  indexNames,
  ip,
  skip,
  startDate,
  type,
}: UseNetworkTls): [boolean, NetworkTlsArgs] => {
  const getTlsSelector = networkSelectors.tlsSelector();
  const { activePage, limit, sort } = useSelector(
    (state: State) => getTlsSelector(state, type, flowTarget),
    shallowEqual
  );
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);

  const [networkTlsRequest, setHostRequest] = useState<NetworkTlsRequestOptions>({
    defaultIndex: indexNames,
    factoryQueryType: NetworkQueries.tls,
    filterQuery: createFilter(filterQuery),
    flowTarget,
    id,
    ip,
    pagination: generateTablePaginationOptions(activePage, limit),
    sort,
    timerange: {
      interval: '12h',
      from: startDate ? startDate : '',
      to: endDate ? endDate : new Date(Date.now()).toISOString(),
    },
  });

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setHostRequest((prevRequest) => ({
        ...prevRequest,
        pagination: generateTablePaginationOptions(newActivePage, limit),
      }));
    },
    [limit]
  );

  const [networkTlsResponse, setNetworkTlsResponse] = useState<NetworkTlsArgs>({
    tls: [],
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

  const networkTlsSearch = useCallback(
    (request: NetworkTlsRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkTlsRequestOptions, NetworkTlsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkTlsResponse((prevResponse) => ({
                    ...prevResponse,
                    tls: response.edges,
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
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_TLS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({ title: i18n.FAIL_NETWORK_TLS, text: msg.message });
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
        ...prevRequest,
        defaultIndex: indexNames,
        filterQuery: createFilter(filterQuery),
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
  }, [activePage, indexNames, endDate, filterQuery, limit, startDate, sort, skip]);

  useEffect(() => {
    networkTlsSearch(networkTlsRequest);
  }, [networkTlsRequest, networkTlsSearch]);

  return [loading, networkTlsResponse];
};
