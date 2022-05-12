/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListType,
  ExceptionListItemSchema,
  ExceptionListIdentifiers,
  Pagination,
} from '@kbn/securitysolution-io-ts-list-types';
import type {
  FilterOptions,
  ExceptionsPagination,
  ExceptionListItemIdentifiers,
  Filter,
} from '../types';

export type ViewerFlyoutName = 'addException' | 'editException' | null;

export interface State {
  filterOptions: FilterOptions;
  pagination: ExceptionsPagination;
  exceptions: ExceptionListItemSchema[];
  exceptionToEdit: ExceptionListItemSchema | null;
  loadingItemIds: ExceptionListItemIdentifiers[];
  isInitLoading: boolean;
  currentModal: ViewerFlyoutName;
  exceptionListTypeToEdit: ExceptionListType | null;
  totalEndpointItems: number;
  totalDetectionsItems: number;
  showEndpointListsOnly: boolean;
  showDetectionsListsOnly: boolean;
}

export type Action =
  | {
      type: 'setExceptions';
      lists: ExceptionListIdentifiers[];
      exceptions: ExceptionListItemSchema[];
      pagination: Pagination;
    }
  | {
      type: 'updateFilterOptions';
      filters: Partial<Filter>;
    }
  | { type: 'updateIsInitLoading'; loading: boolean }
  | { type: 'updateModalOpen'; modalName: ViewerFlyoutName }
  | {
      type: 'updateExceptionToEdit';
      lists: ExceptionListIdentifiers[];
      exception: ExceptionListItemSchema;
    }
  | { type: 'updateLoadingItemIds'; items: ExceptionListItemIdentifiers[] }
  | { type: 'updateExceptionListTypeToEdit'; exceptionListType: ExceptionListType | null }
  | {
      type: 'setExceptionItemTotals';
      totalEndpointItems: number | null;
      totalDetectionsItems: number | null;
    };

export const allExceptionItemsReducer =
  () =>
  (state: State, action: Action): State => {
    switch (action.type) {
      case 'setExceptions': {
        const { exceptions, pagination } = action;

        return {
          ...state,
          pagination: {
            ...state.pagination,
            pageIndex: pagination.page - 1,
            pageSize: pagination.perPage,
            totalItemCount: pagination.total ?? 0,
          },
          exceptions,
        };
      }
      case 'updateFilterOptions': {
        const { filter, pagination, showEndpointListsOnly, showDetectionsListsOnly } =
          action.filters;
        return {
          ...state,
          filterOptions: {
            ...state.filterOptions,
            ...filter,
          },
          pagination: {
            ...state.pagination,
            ...pagination,
          },
          showEndpointListsOnly: showEndpointListsOnly ?? state.showEndpointListsOnly,
          showDetectionsListsOnly: showDetectionsListsOnly ?? state.showDetectionsListsOnly,
        };
      }
      case 'setExceptionItemTotals': {
        return {
          ...state,
          totalEndpointItems:
            action.totalEndpointItems == null
              ? state.totalEndpointItems
              : action.totalEndpointItems,
          totalDetectionsItems:
            action.totalDetectionsItems == null
              ? state.totalDetectionsItems
              : action.totalDetectionsItems,
        };
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
        const { exception, lists } = action;
        const exceptionListToEdit = lists.find((list) => {
          return list !== null && exception.list_id === list.listId;
        });
        return {
          ...state,
          exceptionToEdit: exception,
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
