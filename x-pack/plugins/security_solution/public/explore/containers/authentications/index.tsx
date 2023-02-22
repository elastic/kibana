/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import type {
  AuthenticationsEdges,
  AuthStackByField,
  UserAuthenticationsRequestOptions,
} from '../../../../common/search_strategy/security_solution';
import { UsersQueries } from '../../../../common/search_strategy/security_solution';
import type { PageInfoPaginated, SortField } from '../../../../common/search_strategy';
import type { ESTermQuery } from '../../../../common/typed_json';

import type { inputsModel } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';

import type { InspectResponse } from '../../../types';

import * as i18n from './translations';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';

export interface AuthenticationArgs {
  authentications: AuthenticationsEdges[];
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

interface UseAuthentications {
  activePage: number;
  endDate: string;
  filterQuery?: ESTermQuery | string;
  indexNames: string[];
  limit: number;
  skip: boolean;
  stackByField: AuthStackByField;
  startDate: string;
}

export const useAuthentications = ({
  activePage,
  endDate,
  filterQuery,
  indexNames,
  limit,
  skip,
  stackByField,
  startDate,
}: UseAuthentications): [boolean, AuthenticationArgs] => {
  const [authenticationsRequest, setAuthenticationsRequest] =
    useState<UserAuthenticationsRequestOptions | null>(null);

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

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.authentications>({
    factoryQueryType: UsersQueries.authentications,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.FAIL_AUTHENTICATIONS,
    abort: skip,
  });

  const authenticationsResponse = useMemo(
    () => ({
      endDate,
      authentications: response.edges,
      inspect,
      isInspected: false,
      loadPage: wrappedLoadMore,
      pageInfo: response.pageInfo,
      refetch,
      startDate,
      totalCount: response.totalCount,
    }),
    [
      endDate,
      inspect,
      refetch,
      response.edges,
      response.pageInfo,
      response.totalCount,
      startDate,
      wrappedLoadMore,
    ]
  );

  useEffect(() => {
    setAuthenticationsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
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
  }, [activePage, endDate, filterQuery, indexNames, stackByField, limit, startDate]);

  useEffect(() => {
    if (!skip && authenticationsRequest) {
      search(authenticationsRequest);
    }
  }, [authenticationsRequest, search, skip]);

  return [loading, authenticationsResponse];
};
