/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ApiProps,
  FilterOptions,
  ExceptionsPagination,
  ExceptionListItemSchema,
  Pagination,
} from '../types';
import { ExceptionList, ExceptionIdentifiers } from '../../../../../public/lists_plugin_deps';

export interface State {
  filterOptions: FilterOptions;
  pagination: ExceptionsPagination;
  endpointList: ExceptionList | null;
  detectionsList: ExceptionList | null;
  exceptions: ExceptionListItemSchema[];
  exceptionToEdit: ExceptionListItemSchema | null;
  loadingItemIds: ApiProps[];
  isModalOpen: boolean;
  isLoading: boolean;
}

export type Action =
  | {
      type: 'setExceptions';
      lists: ExceptionList[];
      exceptions: ExceptionListItemSchema[];
      pagination: Pagination;
    }
  | {
      type: 'updateFilterOptions';
      filterOptions: Partial<FilterOptions>;
      pagination: Partial<Pagination>;
      ruleExceptionLists: ExceptionIdentifiers[];
    }
  | { type: 'updateModalOpen'; isOpen: boolean }
  | { type: 'updateExceptionToEdit'; exception: ExceptionListItemSchema }
  | { type: 'updateLoadingItemIds'; items: ApiProps[] };

export const allExceptionItemsReducer = () => (state: State, action: Action): State => {
  switch (action.type) {
    case 'setExceptions': {
      const endpointList = action.lists.filter((t) => t.type === 'endpoint');
      const detectionsList = action.lists.filter((t) => t.type === 'detection');

      return {
        ...state,
        endpointList: state.filterOptions.showEndpointList
          ? endpointList[0] ?? null
          : state.endpointList,
        detectionsList: state.filterOptions.showDetectionsList
          ? detectionsList[0] ?? null
          : state.detectionsList,
        pagination: {
          ...state.pagination,
          pageIndex: action.pagination.page - 1,
          pageSize: action.pagination.perPage,
          totalItemCount: action.pagination.total,
        },
        exceptions: action.exceptions,
        isLoading: false,
      };
    }
    case 'updateFilterOptions': {
      const returnState = {
        ...state,
        filterOptions: {
          ...state.filterOptions,
          ...action.filterOptions,
        },
        pagination: {
          ...state.pagination,
          ...action.pagination,
        },
        isLoading: true,
      };

      if (action.filterOptions.showEndpointList) {
        const exceptions = state.exceptions.filter((t) => t.type === 'endpoint');

        return {
          ...returnState,
          exceptions,
        };
      } else if (action.filterOptions.showDetectionsList) {
        const exceptions = state.exceptions.filter((t) => t.type === 'detection');

        return {
          ...returnState,
          exceptions,
        };
      } else {
        return {
          ...returnState,
        };
      }
    }
    case 'updateLoadingItemIds': {
      return {
        ...state,
        loadingItemIds: [...state.loadingItemIds, ...action.items],
      };
    }
    case 'updateExceptionToEdit': {
      return {
        ...state,
        exceptionToEdit: action.exception,
      };
    }
    case 'updateModalOpen': {
      return {
        ...state,
        isModalOpen: action.isOpen,
      };
    }
    default:
      return state;
  }
};
