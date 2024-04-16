/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { set } from '@kbn/safer-lodash-set';
import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash';
import { useCallback, useEffect, useReducer, useRef, useMemo } from 'react';
import { Subscription } from 'rxjs';

import { isRunningResponse } from '@kbn/data-plugin/common';
import type {
  RuleRegistrySearchRequest,
  RuleRegistrySearchRequestPagination,
  RuleRegistrySearchResponse,
} from '@kbn/rule-registry-plugin/common/search_strategy';
import type {
  MappingRuntimeFields,
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Alert, Alerts, GetInspectQuery, InspectQuery } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { DefaultSort } from './constants';

export interface FetchAlertsArgs {
  featureIds: ValidFeatureId[];
  fields: QueryDslFieldAndFormat[];
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  onLoaded?: () => void;
  onPageChange: (pagination: RuleRegistrySearchRequestPagination) => void;
  runtimeMappings?: MappingRuntimeFields;
  sort: SortCombinations[];
  skip: boolean;
}

type AlertRequest = Omit<FetchAlertsArgs, 'featureIds' | 'skip' | 'onPageChange'>;

type Refetch = () => void;

export interface FetchAlertResp {
  /**
   * We need to have it because of lot code is expecting this format
   * @deprecated
   */
  oldAlertsData: Array<Array<{ field: string; value: string[] }>>;
  /**
   * We need to have it because of lot code is expecting this format
   * @deprecated
   */
  ecsAlertsData: unknown[];
  alerts: Alerts;
  isInitializing: boolean;
  getInspectQuery: GetInspectQuery;
  refetch: Refetch;
  totalAlerts: number;
}

type AlertResponseState = Omit<FetchAlertResp, 'getInspectQuery' | 'refetch'>;
interface AlertStateReducer {
  loading: boolean;
  request: Omit<FetchAlertsArgs, 'skip' | 'onPageChange'>;
  response: AlertResponseState;
}

type AlertActions =
  | { type: 'loading'; loading: boolean }
  | {
      type: 'response';
      alerts: Alerts;
      totalAlerts: number;
      oldAlertsData: Array<Array<{ field: string; value: string[] }>>;
      ecsAlertsData: unknown[];
    }
  | { type: 'resetPagination' }
  | { type: 'request'; request: Omit<FetchAlertsArgs, 'skip' | 'onPageChange'> };

const initialAlertState: AlertStateReducer = {
  loading: false,
  request: {
    featureIds: [],
    fields: [],
    query: {
      bool: {},
    },
    pagination: {
      pageIndex: 0,
      pageSize: 50,
    },
    sort: DefaultSort,
  },
  response: {
    alerts: [],
    oldAlertsData: [],
    ecsAlertsData: [],
    totalAlerts: -1,
    isInitializing: true,
  },
};

function alertReducer(state: AlertStateReducer, action: AlertActions) {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: action.loading };
    case 'response':
      return {
        ...state,
        loading: false,
        response: {
          isInitializing: false,
          alerts: action.alerts,
          totalAlerts: action.totalAlerts,
          oldAlertsData: action.oldAlertsData,
          ecsAlertsData: action.ecsAlertsData,
        },
      };
    case 'resetPagination':
      return {
        ...state,
        request: {
          ...state.request,
          pagination: {
            ...state.request.pagination,
            pageIndex: 0,
          },
        },
      };
    case 'request':
      return { ...state, request: action.request };
    default:
      throw new Error();
  }
}
export type UseFetchAlerts = ({
  featureIds,
  fields,
  query,
  pagination,
  onLoaded,
  onPageChange,
  runtimeMappings,
  skip,
  sort,
}: FetchAlertsArgs) => [boolean, FetchAlertResp];
const useFetchAlerts = ({
  featureIds,
  fields,
  query,
  pagination,
  onLoaded,
  onPageChange,
  runtimeMappings,
  skip,
  sort,
}: FetchAlertsArgs): [boolean, FetchAlertResp] => {
  const refetch = useRef<Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [{ loading, request: alertRequest, response: alertResponse }, dispatch] = useReducer(
    alertReducer,
    initialAlertState
  );
  const prevAlertRequest = useRef<AlertRequest | null>(null);
  const inspectQuery = useRef<InspectQuery>({
    request: [],
    response: [],
  });
  const { data } = useKibana().services;

  const getInspectQuery = useCallback(() => inspectQuery.current, []);
  const refetchGrid = useCallback(() => {
    if ((prevAlertRequest.current?.pagination?.pageIndex ?? 0) !== 0) {
      dispatch({ type: 'resetPagination' });
    } else {
      refetch.current();
    }
  }, []);

  const fetchAlerts = useCallback(
    (request: AlertRequest | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        prevAlertRequest.current = request;
        abortCtrl.current = new AbortController();
        dispatch({ type: 'loading', loading: true });
        if (data && data.search) {
          searchSubscription$.current = data.search
            .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(
              { ...request, featureIds, fields, query },
              {
                strategy: 'privateRuleRegistryAlertsSearchStrategy',
                abortSignal: abortCtrl.current.signal,
              }
            )
            .subscribe({
              next: (response: RuleRegistrySearchResponse) => {
                if (!isRunningResponse(response)) {
                  const { rawResponse } = response;
                  inspectQuery.current = {
                    request: response?.inspect?.dsl ?? [],
                    response: [JSON.stringify(rawResponse)] ?? [],
                  };
                  let totalAlerts = 0;
                  if (rawResponse.hits.total && typeof rawResponse.hits.total === 'number') {
                    totalAlerts = rawResponse.hits.total;
                  } else if (rawResponse.hits.total && typeof rawResponse.hits.total === 'object') {
                    totalAlerts = rawResponse.hits.total?.value ?? 0;
                  }
                  const alerts = rawResponse.hits.hits.reduce<Alerts>((acc, hit) => {
                    if (hit.fields) {
                      acc.push({
                        ...hit.fields,
                        _id: hit._id,
                        _index: hit._index,
                      } as Alert);
                    }
                    return acc;
                  }, []);

                  const { oldAlertsData, ecsAlertsData } = alerts.reduce<{
                    oldAlertsData: Array<Array<{ field: string; value: string[] }>>;
                    ecsAlertsData: unknown[];
                  }>(
                    (acc, alert) => {
                      const itemOldData = Object.entries(alert).reduce<
                        Array<{ field: string; value: string[] }>
                      >((oldData, [key, value]) => {
                        oldData.push({ field: key, value: value as string[] });
                        return oldData;
                      }, []);
                      const ecsData = Object.entries(alert).reduce((ecs, [key, value]) => {
                        set(ecs, key, value ?? []);
                        return ecs;
                      }, {});
                      acc.oldAlertsData.push(itemOldData);
                      acc.ecsAlertsData.push(ecsData);
                      return acc;
                    },
                    { oldAlertsData: [], ecsAlertsData: [] }
                  );

                  dispatch({
                    type: 'response',
                    alerts,
                    oldAlertsData,
                    ecsAlertsData,
                    totalAlerts,
                  });
                  dispatch({ type: 'loading', loading: false });
                  onLoaded?.();
                  searchSubscription$.current.unsubscribe();
                }
              },
              error: (msg) => {
                dispatch({ type: 'loading', loading: false });
                onLoaded?.();
                data.search.showError(msg);
                searchSubscription$.current.unsubscribe();
              },
            });
        }
      };

      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [skip, data, featureIds, query, fields, onLoaded]
  );

  // FUTURE ENGINEER
  // This useEffect is only to fetch the alert when these props below changed
  // fields, pagination, sort, runtimeMappings
  useEffect(() => {
    if (featureIds.length === 0) {
      return;
    }
    const newAlertRequest = {
      featureIds,
      fields,
      pagination,
      query: prevAlertRequest.current?.query ?? {},
      runtimeMappings,
      sort,
    };
    if (
      newAlertRequest.fields.length > 0 &&
      !deepEqual(newAlertRequest, prevAlertRequest.current)
    ) {
      dispatch({
        type: 'request',
        request: newAlertRequest,
      });
    }
  }, [featureIds, fields, pagination, sort, runtimeMappings]);

  // FUTURE ENGINEER
  // This useEffect is only to fetch the alert when query props changed
  // because we want to reset the pageIndex of pagination to 0
  useEffect(() => {
    if (featureIds.length === 0 || !prevAlertRequest.current) {
      return;
    }
    const resetPagination = {
      pageIndex: 0,
      pageSize: prevAlertRequest.current?.pagination?.pageSize ?? 50,
    };
    const newAlertRequest = {
      ...prevAlertRequest.current,
      featureIds,
      pagination: resetPagination,
      query,
    };

    if (
      (newAlertRequest?.fields ?? []).length > 0 &&
      !deepEqual(newAlertRequest.query, prevAlertRequest.current.query)
    ) {
      dispatch({
        type: 'request',
        request: newAlertRequest,
      });
      onPageChange(resetPagination);
    }
  }, [featureIds, onPageChange, query]);

  useEffect(() => {
    if (alertRequest.featureIds.length > 0 && !deepEqual(alertRequest, prevAlertRequest.current)) {
      fetchAlerts(alertRequest);
    }
  }, [alertRequest, fetchAlerts]);

  const alertResponseMemo = useMemo(
    () => ({
      ...alertResponse,
      getInspectQuery,
      refetch: refetchGrid,
    }),
    [alertResponse, getInspectQuery, refetchGrid]
  );

  return [loading, alertResponseMemo];
};

export { useFetchAlerts };
