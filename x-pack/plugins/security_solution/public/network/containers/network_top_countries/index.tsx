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
import type { ESTermQuery } from '../../../../common/typed_json';
import type { inputsModel } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useKibana } from '../../../common/lib/kibana';
import { createFilter } from '../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import type { networkModel } from '../../store';
import { networkSelectors } from '../../store';
import type {
  FlowTargetSourceDest,
  NetworkTopCountriesEdges,
  NetworkTopCountriesRequestOptions,
  NetworkTopCountriesStrategyResponse,
  PageInfoPaginated,
} from '../../../../common/search_strategy';
import { NetworkQueries } from '../../../../common/search_strategy';
import { getInspectResponse } from '../../../helpers';
import type { InspectResponse } from '../../../types';
import * as i18n from './translations';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const ID = 'networkTopCountriesQuery';

export interface NetworkTopCountriesArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  networkTopCountries: NetworkTopCountriesEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

interface UseNetworkTopCountries {
  endDate: string;
  filterQuery?: ESTermQuery | string;
  flowTarget: FlowTargetSourceDest;
  id: string;
  indexNames: string[];
  ip?: string;
  skip: boolean;
  startDate: string;
  type: networkModel.NetworkType;
}

export const useNetworkTopCountries = ({
  endDate,
  filterQuery,
  flowTarget,
  id,
  indexNames,
  ip,
  skip,
  startDate,
  type,
}: UseNetworkTopCountries): [boolean, NetworkTopCountriesArgs] => {
  const getTopCountriesSelector = useMemo(() => networkSelectors.topCountriesSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) =>
    getTopCountriesSelector(state, type, flowTarget)
  );
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);

  const [networkTopCountriesRequest, setHostRequest] =
    useState<NetworkTopCountriesRequestOptions | null>(null);

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
  const { addError, addWarning } = useAppToasts();

  const [networkTopCountriesResponse, setNetworkTopCountriesResponse] =
    useState<NetworkTopCountriesArgs>({
      networkTopCountries: [],
      id,
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

  const networkTopCountriesSearch = useCallback(
    (request: NetworkTopCountriesRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<NetworkTopCountriesRequestOptions, NetworkTopCountriesStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setNetworkTopCountriesResponse((prevResponse) => ({
                  ...prevResponse,
                  networkTopCountries: response.edges,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  pageInfo: response.pageInfo,
                  refetch: refetch.current,
                  totalCount: response.totalCount,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_NETWORK_TOP_COUNTRIES);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_NETWORK_TOP_COUNTRIES,
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
    [data.search, addWarning, addError, skip]
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkQueries.topCountries,
        filterQuery: createFilter(filterQuery),
        flowTarget,
        ip,
        pagination: generateTablePaginationOptions(activePage, limit),
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
  }, [activePage, indexNames, endDate, filterQuery, ip, limit, startDate, sort, flowTarget]);

  useEffect(() => {
    networkTopCountriesSearch(networkTopCountriesRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [networkTopCountriesRequest, networkTopCountriesSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, networkTopCountriesResponse];
};
