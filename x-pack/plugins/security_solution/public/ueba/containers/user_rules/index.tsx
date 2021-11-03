/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { inputsModel, State } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { uebaModel, uebaSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import {
  DocValueFields,
  UebaQueries,
  UserRulesRequestOptions,
  UserRulesStrategyResponse,
  UserRulesStrategyUserResponse,
} from '../../../../common';
import { ESTermQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useTransforms } from '../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const ID = 'userRulesQuery';

type LoadPage = (newActivePage: number) => void;
export interface UserRulesState {
  data: UserRulesStrategyUserResponse[];
  endDate: string;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: LoadPage;
  refetch: inputsModel.Refetch;
  startDate: string;
}

interface UseUserRules {
  docValueFields?: DocValueFields[];
  endDate: string;
  filterQuery?: ESTermQuery | string;
  hostName: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
  type: uebaModel.UebaType;
}

export const useUserRules = ({
  docValueFields,
  endDate,
  filterQuery,
  hostName,
  indexNames,
  skip = false,
  startDate,
}: UseUserRules): [boolean, UserRulesState] => {
  const getUserRulesSelector = useMemo(() => uebaSelectors.userRulesSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getUserRulesSelector(state)
  );
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [userRulesRequest, setUserRulesRequest] = useState<UserRulesRequestOptions | null>(null);
  const { getTransformChangesIfTheyExist } = useTransforms();
  const { addError, addWarning } = useAppToasts();

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setUserRulesRequest((prevRequest) => {
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

  const [userRulesResponse, setUserRulesResponse] = useState<UserRulesState>({
    data: [],
    endDate,
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    loadPage: wrappedLoadMore,
    refetch: refetch.current,
    startDate,
  });

  const userRulesSearch = useCallback(
    (request: UserRulesRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription.current = data.search
          .search<UserRulesRequestOptions, UserRulesStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setUserRulesResponse((prevResponse) => ({
                  ...prevResponse,
                  data: response.data,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_HOST_RULES);
                searchSubscription.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, { title: i18n.FAIL_HOST_RULES });
              searchSubscription.current.unsubscribe();
            },
          });
        setLoading(false);
      };
      searchSubscription.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning, skip]
  );

  useEffect(() => {
    setUserRulesRequest((prevRequest) => {
      const { indices, factoryQueryType, timerange } = getTransformChangesIfTheyExist({
        factoryQueryType: UebaQueries.userRules,
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
        hostName,
        defaultIndex: indices,
        docValueFields: docValueFields ?? [],
        factoryQueryType,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange,
        sort,
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
    sort,
    getTransformChangesIfTheyExist,
    hostName,
  ]);

  useEffect(() => {
    userRulesSearch(userRulesRequest);
    return () => {
      searchSubscription.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [userRulesRequest, userRulesSearch]);

  return [loading, userRulesResponse];
};
