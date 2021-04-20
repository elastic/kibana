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

import { ESTermQuery } from '../../../../common/typed_json';
import { inputsModel } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useKibana } from '../../../common/lib/kibana';
import { createFilter } from '../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { networkModel, networkSelectors } from '../../store';
import {
  NetworkQueries,
  NetworkTlsRequestOptions,
  NetworkTlsStrategyResponse,
} from '../../../../common/search_strategy/security_solution/network';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';

import * as i18n from './translations';
import { getInspectResponse } from '../../../helpers';
import { FlowTargetSourceDest, PageInfoPaginated } from '../../../../common/search_strategy';

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
  const getTlsSelector = useMemo(() => networkSelectors.tlsSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) =>
    getTlsSelector(state, type, flowTarget)
  );
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);

  const [networkTlsRequest, setHostRequest] = useState<NetworkTlsRequestOptions | null>(null);

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
    (request: NetworkTlsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<NetworkTlsRequestOptions, NetworkTlsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setNetworkTlsResponse((prevResponse) => ({
                  ...prevResponse,
                  tls: response.edges,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  pageInfo: response.pageInfo,
                  refetch: refetch.current,
                  totalCount: response.totalCount,
                }));

                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_TLS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              notifications.toasts.addDanger({
                title: i18n.FAIL_NETWORK_TLS,
                text: msg.message,
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
    [data.search, notifications.toasts, skip]
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
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
    networkTlsSearch(networkTlsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [networkTlsRequest, networkTlsSearch]);

  return [loading, networkTlsResponse];
};
