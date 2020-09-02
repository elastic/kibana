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
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { inputsModel, State } from '../../../common/store';
import { useKibana } from '../../../common/lib/kibana';
import { createFilter } from '../../../common/containers/helpers';
import { PageInfoPaginated } from '../../../../common/search_strategy/security_solution';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { networkModel, networkSelectors } from '../../store';
import {
  FlowTargetSourceDest,
  NetworkQueries,
  NetworkTopCountriesEdges,
  NetworkTopCountriesRequestOptions,
  NetworkTopCountriesStrategyResponse,
} from '../../../../common/search_strategy/security_solution/network';
import { AbortError } from '../../../../../../../src/plugins/data/common';
import * as i18n from './translations';

const ID = 'networkTopCountriesQuery';

export interface NetworkTopCountriesArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  networkTopCountries: NetworkTopCountriesEdges[];
  totalCount: number;
}

interface UseNetworkTopCountries {
  flowTarget: FlowTargetSourceDest;
  ip?: string;
  type: networkModel.NetworkType;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
  id?: string;
}

export const useNetworkTopCountries = ({
  endDate,
  filterQuery,
  flowTarget,
  id = ID,
  skip,
  startDate,
  type,
}: UseNetworkTopCountries): [boolean, NetworkTopCountriesArgs] => {
  // const getQuery = inputsSelectors.globalQueryByIdSelector();
  // const { isInspected } = useSelector((state: State) => getQuery(state, id), shallowEqual);
  const getTopCountriesSelector = networkSelectors.topCountriesSelector();
  const { activePage, limit, sort } = useSelector(
    (state: State) => getTopCountriesSelector(state, type, flowTarget),
    shallowEqual
  );
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);

  const [networkTopCountriesRequest, setHostRequest] = useState<NetworkTopCountriesRequestOptions>({
    defaultIndex,
    factoryQueryType: NetworkQueries.topCountries,
    filterQuery: createFilter(filterQuery),
    flowTarget,
    // inspect: isInspected,
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

  const [networkTopCountriesResponse, setNetworkTopCountriesResponse] = useState<
    NetworkTopCountriesArgs
  >({
    networkTopCountries: [],
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

  const networkTopCountriesSearch = useCallback(
    (request: NetworkTopCountriesRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkTopCountriesRequestOptions, NetworkTopCountriesStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            signal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkTopCountriesResponse((prevResponse) => ({
                    ...prevResponse,
                    networkTopCountries: response.edges,
                    inspect: response.inspect ?? prevResponse.inspect,
                    pageInfo: response.pageInfo,
                    refetch: refetch.current,
                    totalCount: response.totalCount,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_TOP_COUNTRIES);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_TOP_COUNTRIES,
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
    if (skip) {
      return;
    }

    setHostRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
        filterQuery: createFilter(filterQuery),
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
  }, [activePage, defaultIndex, endDate, filterQuery, limit, startDate, sort, skip]);

  useEffect(() => {
    networkTopCountriesSearch(networkTopCountriesRequest);
  }, [networkTopCountriesRequest, networkTopCountriesSearch]);

  return [loading, networkTopCountriesResponse];
};
