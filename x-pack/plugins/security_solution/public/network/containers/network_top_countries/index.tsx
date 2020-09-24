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
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { networkModel, networkSelectors } from '../../store';
import {
  FlowTargetSourceDest,
  NetworkQueries,
  NetworkTopCountriesEdges,
  NetworkTopCountriesRequestOptions,
  NetworkTopCountriesStrategyResponse,
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

const ID = 'networkTopCountriesQuery';

export interface NetworkTopCountriesArgs {
  id: string;
  inspect: InspectResponse;
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
  indexNames: string[];
  type: networkModel.NetworkType;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
}

export const useNetworkTopCountries = ({
  endDate,
  filterQuery,
  flowTarget,
  indexNames,
  skip,
  startDate,
  type,
}: UseNetworkTopCountries): [boolean, NetworkTopCountriesArgs] => {
  const getTopCountriesSelector = networkSelectors.topCountriesSelector();
  const { activePage, limit, sort } = useSelector(
    (state: State) => getTopCountriesSelector(state, type, flowTarget),
    shallowEqual
  );
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);

  const [networkTopCountriesRequest, setHostRequest] = useState<NetworkTopCountriesRequestOptions>({
    defaultIndex: indexNames,
    factoryQueryType: NetworkQueries.topCountries,
    filterQuery: createFilter(filterQuery),
    flowTarget,
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

  const networkTopCountriesSearch = useCallback(
    (request: NetworkTopCountriesRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkTopCountriesRequestOptions, NetworkTopCountriesStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkTopCountriesResponse((prevResponse) => ({
                    ...prevResponse,
                    networkTopCountries: response.edges,
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
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex: indexNames,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        sort,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      };
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, indexNames, endDate, filterQuery, limit, startDate, sort, skip]);

  useEffect(() => {
    networkTopCountriesSearch(networkTopCountriesRequest);
  }, [networkTopCountriesRequest, networkTopCountriesSearch]);

  return [loading, networkTopCountriesResponse];
};
