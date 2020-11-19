/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';

import { HostsQueries } from '../../../../common/search_strategy/security_solution';
import {
  HostAuthenticationsRequestOptions,
  HostAuthenticationsStrategyResponse,
  AuthenticationsEdges,
  PageInfoPaginated,
  DocValueFields,
  SortField,
} from '../../../../common/search_strategy';
import { ESTermQuery } from '../../../../common/typed_json';

import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { inputsModel } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';

import { hostsModel, hostsSelectors } from '../../store';

import * as i18n from './translations';

const ID = 'hostsAuthenticationsQuery';

export interface AuthenticationArgs {
  authentications: AuthenticationsEdges[];
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

interface UseAuthentications {
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  startDate: string;
  type: hostsModel.HostsType;
  skip: boolean;
}

export const useAuthentications = ({
  docValueFields,
  filterQuery,
  endDate,
  indexNames,
  startDate,
  type,
  skip,
}: UseAuthentications): [boolean, AuthenticationArgs] => {
  const getAuthenticationsSelector = hostsSelectors.authenticationsSelector();
  const { activePage, limit } = useShallowEqualSelector((state) =>
    getAuthenticationsSelector(state, type)
  );
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [
    authenticationsRequest,
    setAuthenticationsRequest,
  ] = useState<HostAuthenticationsRequestOptions | null>(
    !skip
      ? {
          defaultIndex: indexNames,
          docValueFields: docValueFields ?? [],
          factoryQueryType: HostsQueries.authentications,
          filterQuery: createFilter(filterQuery),
          pagination: generateTablePaginationOptions(activePage, limit),
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
          sort: {} as SortField,
        }
      : null
  );

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setAuthenticationsRequest((prevRequest) => {
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

  const [authenticationsResponse, setAuthenticationsResponse] = useState<AuthenticationArgs>({
    authentications: [],
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    loading: true,
    loadPage: wrappedLoadMore,
    pageInfo: {
      activePage: 0,
      fakeTotalCount: 0,
      showMorePagesIndicator: false,
    },
    refetch: refetch.current,
    totalCount: -1,
  });

  const authenticationsSearch = useCallback(
    (request: HostAuthenticationsRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostAuthenticationsRequestOptions, HostAuthenticationsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setAuthenticationsResponse((prevResponse) => ({
                    ...prevResponse,
                    authentications: response.edges,
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
                notifications.toasts.addWarning(i18n.ERROR_AUTHENTICATIONS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_AUTHENTICATIONS,
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
    setAuthenticationsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        factoryQueryType: HostsQueries.authentications,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort: {} as SortField,
      };
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, docValueFields, endDate, filterQuery, indexNames, limit, skip, startDate]);

  useEffect(() => {
    authenticationsSearch(authenticationsRequest);
  }, [authenticationsRequest, authenticationsSearch]);

  return [loading, authenticationsResponse];
};
