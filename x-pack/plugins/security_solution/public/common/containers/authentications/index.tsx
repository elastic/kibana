/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { Subscription } from 'rxjs';

import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import {
  AuthenticationsEdges,
  AuthStackByField,
  UserAuthenticationsRequestOptions,
  UserAuthenticationsStrategyResponse,
  UsersQueries,
} from '../../../../common/search_strategy/security_solution';
import { PageInfoPaginated, DocValueFields, SortField } from '../../../../common/search_strategy';
import { ESTermQuery } from '../../../../common/typed_json';

import { inputsModel } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';

import * as i18n from './translations';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export interface AuthenticationArgs {
  authentications: AuthenticationsEdges[];
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
  skip: boolean;
  stackByField: AuthStackByField;
  activePage: number;
  limit: number;
}

export const useAuthentications = ({
  docValueFields,
  filterQuery,
  endDate,
  indexNames,
  startDate,
  activePage,
  limit,
  skip,
  stackByField,
}: UseAuthentications): [boolean, AuthenticationArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [authenticationsRequest, setAuthenticationsRequest] =
    useState<UserAuthenticationsRequestOptions | null>(null);
  const { addError, addWarning } = useAppToasts();

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
    (request: UserAuthenticationsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<UserAuthenticationsRequestOptions, UserAuthenticationsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setAuthenticationsResponse((prevResponse) => ({
                  ...prevResponse,
                  authentications: response.edges,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  pageInfo: response.pageInfo,
                  refetch: refetch.current,
                  totalCount: response.totalCount,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_AUTHENTICATIONS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_AUTHENTICATIONS,
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
    setAuthenticationsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        factoryQueryType: UsersQueries.authentications,
        filterQuery: createFilter(filterQuery),
        stackByField,
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort: {} as SortField,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [
    activePage,
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
    stackByField,
    limit,
    startDate,
  ]);

  useEffect(() => {
    authenticationsSearch(authenticationsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [authenticationsRequest, authenticationsSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, authenticationsResponse];
};
