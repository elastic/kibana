/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FilterOptions, ExceptionsPagination, ExceptionListItemIdentifiers } from '../types';
import {
  ExceptionList,
  ExceptionListType,
  ExceptionListItemSchema,
  ExceptionIdentifiers,
  Pagination,
} from '../../../../../public/lists_plugin_deps';

export type ViewerModalName = 'addModal' | 'editModal' | null;

export interface State {
  filterOptions: FilterOptions;
  pagination: ExceptionsPagination;
  endpointList: ExceptionList | null;
  detectionsList: ExceptionList | null;
  allExceptions: ExceptionListItemSchema[];
  exceptions: ExceptionListItemSchema[];
  exceptionToEdit: ExceptionListItemSchema | null;
  loadingLists: ExceptionIdentifiers[];
  loadingItemIds: ExceptionListItemIdentifiers[];
  isInitLoading: boolean;
  currentModal: ViewerModalName;
  exceptionListTypeToEdit: ExceptionListType | null;
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
      pagination: Partial<ExceptionsPagination>;
      allLists: ExceptionIdentifiers[];
    }
  | { type: 'updateIsInitLoading'; loading: boolean }
  | { type: 'updateModalOpen'; modalName: ViewerModalName }
  | { type: 'updateExceptionToEdit'; exception: ExceptionListItemSchema }
  | { type: 'updateLoadingItemIds'; items: ExceptionListItemIdentifiers[] }
  | { type: 'updateExceptionListTypeToEdit'; exceptionListType: ExceptionListType | null };

export const allExceptionItemsReducer = () => (state: State, action: Action): State => {
  switch (action.type) {
    case 'setExceptions': {
      const endpointList = action.lists.filter((t) => t.type === 'endpoint');
      const detectionsList = action.lists.filter((t) => t.type === 'detection');

      return {
        ...state,
        endpointList: state.filterOptions.showDetectionsList
          ? state.endpointList
          : endpointList[0] ?? null,
        detectionsList: state.filterOptions.showEndpointList
          ? state.detectionsList
          : detectionsList[0] ?? null,
        pagination: {
          ...state.pagination,
          pageIndex: action.pagination.page - 1,
          pageSize: action.pagination.perPage,
          totalItemCount: action.pagination.total ?? 0,
        },
        allExceptions: action.exceptions,
        exceptions: action.exceptions,
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
      };

      if (action.filterOptions.showEndpointList) {
        const list = action.allLists.filter((t) => t.type === 'endpoint');

        return {
          ...returnState,
          loadingLists: list,
          exceptions: list.length === 0 ? [] : [...state.exceptions],
        };
      } else if (action.filterOptions.showDetectionsList) {
        const list = action.allLists.filter((t) => t.type === 'detection');

        return {
          ...returnState,
          loadingLists: list,
          exceptions: list.length === 0 ? [] : [...state.exceptions],
        };
      } else {
        return {
          ...returnState,
          loadingLists: action.allLists,
        };
      }
    }
    case 'updateIsInitLoading': {
      return {
        ...state,
        isInitLoading: action.loading,
      };
    }
    case 'updateLoadingItemIds': {
      return {
        ...state,
        loadingItemIds: [...state.loadingItemIds, ...action.items],
      };
    }
    case 'updateExceptionToEdit': {
      const exception = action.exception;
      const exceptionListToEdit = [state.endpointList, state.detectionsList].find((list) => {
        return list !== null && exception.list_id === list.list_id;
      });
      return {
        ...state,
        exceptionToEdit: action.exception,
        exceptionListTypeToEdit: exceptionListToEdit ? exceptionListToEdit.type : null,
      };
    }
    case 'updateModalOpen': {
      return {
        ...state,
        currentModal: action.modalName,
      };
    }
    case 'updateExceptionListTypeToEdit': {
      return {
        ...state,
        exceptionListTypeToEdit: action.exceptionListType,
      };
    }
    default:
      return state;
  }
};
