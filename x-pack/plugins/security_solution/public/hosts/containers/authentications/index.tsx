/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop, pick } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { Subscription } from 'rxjs';

import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
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

import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { inputsModel } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';

import { hostsModel, hostsSelectors } from '../../store';

import * as i18n from './translations';
import { useTransforms } from '../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const ID = 'hostsAuthenticationsQuery';

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
  const { activePage, limit } = useDeepEqualSelector((state) =>
    pick(['activePage', 'limit'], getAuthenticationsSelector(state, type))
  );
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [authenticationsRequest, setAuthenticationsRequest] =
    useState<HostAuthenticationsRequestOptions | null>(null);
  const { getTransformChangesIfTheyExist } = useTransforms();
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
      if (request == null || skip) {
        return;
      }
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<HostAuthenticationsRequestOptions, HostAuthenticationsStrategyResponse>(request, {
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
      const { indices, factoryQueryType, timerange } = getTransformChangesIfTheyExist({
        factoryQueryType: HostsQueries.authentications,
        indices: indexNames,
        filterQuery,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      });

      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indices,
        docValueFields: docValueFields ?? [],
        factoryQueryType,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange,
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
    limit,
    startDate,
    getTransformChangesIfTheyExist,
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
