/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useReducer } from 'react';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from './constants';
import { AllCases, SortFieldCase, FilterOptions, QueryParams, Case } from './types';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import * as i18n from './translations';
import { UpdateByKey } from './use_update_case';
import { getCases, patchCase } from './api';

export interface UseGetCasesState {
  data: AllCases;
  filterOptions: FilterOptions;
  isError: boolean;
  loading: string[];
  queryParams: QueryParams;
  selectedCases: Case[];
}

export interface UpdateCase extends UpdateByKey {
  caseId: string;
  version: string;
  refetchCasesStatus: () => void;
}

export type Action =
  | { type: 'FETCH_INIT'; payload: string }
  | {
      type: 'FETCH_CASES_SUCCESS';
      payload: AllCases;
    }
  | { type: 'FETCH_FAILURE'; payload: string }
  | { type: 'FETCH_UPDATE_CASE_SUCCESS' }
  | { type: 'UPDATE_FILTER_OPTIONS'; payload: Partial<FilterOptions> }
  | { type: 'UPDATE_QUERY_PARAMS'; payload: Partial<QueryParams> }
  | { type: 'UPDATE_TABLE_SELECTIONS'; payload: Case[] };

const dataFetchReducer = (state: UseGetCasesState, action: Action): UseGetCasesState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isError: false,
        loading: [...state.loading.filter((e) => e !== action.payload), action.payload],
      };
    case 'FETCH_UPDATE_CASE_SUCCESS':
      return {
        ...state,
        loading: state.loading.filter((e) => e !== 'caseUpdate'),
      };
    case 'FETCH_CASES_SUCCESS':
      return {
        ...state,
        data: action.payload,
        isError: false,
        loading: state.loading.filter((e) => e !== 'cases'),
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isError: true,
        loading: state.loading.filter((e) => e !== action.payload),
      };
    case 'UPDATE_FILTER_OPTIONS':
      return {
        ...state,
        filterOptions: {
          ...state.filterOptions,
          ...action.payload,
        },
      };
    case 'UPDATE_QUERY_PARAMS':
      return {
        ...state,
        queryParams: {
          ...state.queryParams,
          ...action.payload,
        },
      };
    case 'UPDATE_TABLE_SELECTIONS':
      return {
        ...state,
        selectedCases: action.payload,
      };
    default:
      return state;
  }
};

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  search: '',
  reporters: [],
  status: 'open',
  tags: [],
};

export const DEFAULT_QUERY_PARAMS: QueryParams = {
  page: DEFAULT_TABLE_ACTIVE_PAGE,
  perPage: DEFAULT_TABLE_LIMIT,
  sortField: SortFieldCase.createdAt,
  sortOrder: 'desc',
};

export const initialData: AllCases = {
  cases: [],
  countClosedCases: null,
  countOpenCases: null,
  page: 0,
  perPage: 0,
  total: 0,
};
export interface UseGetCases extends UseGetCasesState {
  dispatchUpdateCaseProperty: ({
    updateKey,
    updateValue,
    caseId,
    version,
    refetchCasesStatus,
  }: UpdateCase) => void;
  refetchCases: () => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  setQueryParams: (queryParams: Partial<QueryParams>) => void;
  setSelectedCases: (mySelectedCases: Case[]) => void;
}

export const useGetCases = (initialQueryParams?: QueryParams): UseGetCases => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    data: initialData,
    filterOptions: DEFAULT_FILTER_OPTIONS,
    isError: false,
    loading: [],
    queryParams: initialQueryParams ?? DEFAULT_QUERY_PARAMS,
    selectedCases: [],
  });
  const [, dispatchToaster] = useStateToaster();

  const setSelectedCases = useCallback((mySelectedCases: Case[]) => {
    dispatch({ type: 'UPDATE_TABLE_SELECTIONS', payload: mySelectedCases });
  }, []);

  const setQueryParams = useCallback((newQueryParams: Partial<QueryParams>) => {
    dispatch({ type: 'UPDATE_QUERY_PARAMS', payload: newQueryParams });
  }, []);

  const setFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    dispatch({ type: 'UPDATE_FILTER_OPTIONS', payload: newFilters });
  }, []);

  const fetchCases = useCallback((filterOptions: FilterOptions, queryParams: QueryParams) => {
    let didCancel = false;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT', payload: 'cases' });
      try {
        const response = await getCases({
          filterOptions,
          queryParams,
          signal: abortCtrl.signal,
        });
        if (!didCancel) {
          dispatch({
            type: 'FETCH_CASES_SUCCESS',
            payload: response,
          });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE', payload: 'cases' });
        }
      }
    };
    fetchData();
    return () => {
      abortCtrl.abort();
      didCancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => fetchCases(state.filterOptions, state.queryParams), [
    state.queryParams,
    state.filterOptions,
  ]);

  const dispatchUpdateCaseProperty = useCallback(
    ({ updateKey, updateValue, caseId, refetchCasesStatus, version }: UpdateCase) => {
      let didCancel = false;
      const abortCtrl = new AbortController();

      const fetchData = async () => {
        dispatch({ type: 'FETCH_INIT', payload: 'caseUpdate' });
        try {
          await patchCase(
            caseId,
            { [updateKey]: updateValue },
            // saved object versions are typed as string | undefined, hope that's not true
            version ?? '',
            abortCtrl.signal
          );
          if (!didCancel) {
            dispatch({ type: 'FETCH_UPDATE_CASE_SUCCESS' });
            fetchCases(state.filterOptions, state.queryParams);
            refetchCasesStatus();
          }
        } catch (error) {
          if (!didCancel) {
            errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
            dispatch({ type: 'FETCH_FAILURE', payload: 'caseUpdate' });
          }
        }
      };
      fetchData();
      return () => {
        abortCtrl.abort();
        didCancel = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.filterOptions, state.queryParams]
  );

  const refetchCases = useCallback(() => {
    fetchCases(state.filterOptions, state.queryParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filterOptions, state.queryParams]);

  return {
    ...state,
    dispatchUpdateCaseProperty,
    refetchCases,
    setFilters,
    setQueryParams,
    setSelectedCases,
  };
};
