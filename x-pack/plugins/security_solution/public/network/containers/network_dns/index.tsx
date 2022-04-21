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
  DocValueFields,
  NetworkQueries,
  NetworkDnsRequestOptions,
  NetworkDnsStrategyResponse,
  MatrixOverOrdinalHistogramData,
  NetworkDnsEdges,
  PageInfoPaginated,
} from '../../../../common/search_strategy';
import * as i18n from './translations';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const ID = 'networkDnsQuery';

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
  docValueFields: DocValueFields[];
  indexNames: string[];
  type: networkModel.NetworkType;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
}

export const useNetworkDns = ({
  docValueFields,
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  type,
}: UseNetworkDns): [boolean, NetworkDnsArgs] => {
  const getNetworkDnsSelector = useMemo(() => networkSelectors.dnsSelector(), []);
  const { activePage, sort, isPtrIncluded, limit } = useDeepEqualSelector(getNetworkDnsSelector);
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);

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
  const { addError, addWarning } = useAppToasts();

  const networkDnsSearch = useCallback(
    (request: NetworkDnsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<NetworkDnsRequestOptions, NetworkDnsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
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
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_NETWORK_DNS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_NETWORK_DNS,
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
    setNetworkDnsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
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
  }, [
    activePage,
    indexNames,
    endDate,
    filterQuery,
    limit,
    startDate,
    sort,
    isPtrIncluded,
    docValueFields,
  ]);

  useEffect(() => {
    networkDnsSearch(networkDnsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [networkDnsRequest, networkDnsSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, networkDnsResponse];
};
