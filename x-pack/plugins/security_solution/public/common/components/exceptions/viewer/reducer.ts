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

export type ViewerFlyoutName = 'addException' | 'editException' | 'createExceptionList' | null;

export interface State {
  filterOptions: FilterOptions;
  pagination: ExceptionsPagination;
  exceptionToEdit: ExceptionListItemSchema | null;
  loadingItemIds: ExceptionListItemIdentifiers[];
  isInitLoading: boolean;
  currentModal: ViewerFlyoutName;
  totalEndpointItems: number;
  totalDetectionsItems: number;
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
      case 'updateFilterOptions': {
        const { filter, pagination } =
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
        const { exception } = action;
        return {
          ...state,
          exceptionToEdit: exception,
        };
      }
      case 'updateModalOpen': {
        return {
          ...state,
          currentModal: action.modalName,
        };
      }
      default:
        return state;
    }
  };
