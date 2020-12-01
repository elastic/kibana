/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useState, useEffect, useCallback, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { ESTermQuery } from '../../../../common/typed_json';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { inputsModel } from '../../../common/store';
import { useKibana } from '../../../common/lib/kibana';
import { createFilter } from '../../../common/containers/helpers';
import { PageInfoPaginated } from '../../../graphql/types';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { networkSelectors } from '../../store';
import {
  FlowTarget,
  NetworkQueries,
  NetworkUsersRequestOptions,
  NetworkUsersStrategyResponse,
} from '../../../../common/search_strategy/security_solution/network';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';
import * as i18n from './translations';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';

const ID = 'networkUsersQuery';

export interface NetworkUsersArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  networkUsers: NetworkUsersStrategyResponse['edges'];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  stackByField?: string;
  totalCount: number;
}

interface UseNetworkUsers {
  id?: string;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
  flowTarget: FlowTarget;
  ip: string;
}

export const useNetworkUsers = ({
  endDate,
  filterQuery,
  flowTarget,
  id = ID,
  ip,
  skip,
  startDate,
}: UseNetworkUsers): [boolean, NetworkUsersArgs] => {
  const getNetworkUsersSelector = networkSelectors.usersSelector();
  const { activePage, sort, limit } = useShallowEqualSelector(getNetworkUsersSelector);
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);

  const [networkUsersRequest, setNetworkUsersRequest] = useState<NetworkUsersRequestOptions | null>(
    !skip
      ? {
          defaultIndex,
          factoryQueryType: NetworkQueries.users,
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
      setNetworkUsersRequest((prevRequest) => {
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

  const [networkUsersResponse, setNetworkUsersResponse] = useState<NetworkUsersArgs>({
    networkUsers: [],
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

  const networkUsersSearch = useCallback(
    (request: NetworkUsersRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkUsersRequestOptions, NetworkUsersStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkUsersResponse((prevResponse) => ({
                    ...prevResponse,
                    networkUsers: response.edges,
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
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_USERS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_USERS,
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
    setNetworkUsersRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        ip,
        defaultIndex,
        factoryQueryType: NetworkQueries.users,
        filterQuery: createFilter(filterQuery),
        flowTarget,
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
  }, [
    activePage,
    defaultIndex,
    endDate,
    filterQuery,
    limit,
    startDate,
    sort,
    skip,
    ip,
    flowTarget,
  ]);

  useEffect(() => {
    networkUsersSearch(networkUsersRequest);
  }, [networkUsersRequest, networkUsersSearch]);

  return [loading, networkUsersResponse];
};
