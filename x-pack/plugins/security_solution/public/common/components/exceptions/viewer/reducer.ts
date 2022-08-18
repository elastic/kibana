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
  ListArray,
} from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsPagination, ExceptionListItemIdentifiers } from '../types';

export type ViewerFlyoutName = 'addException' | 'editException' | null;
export type ViewerState = 'error' | 'empty' | 'empty_search' | 'loading' | 'searching' | null;

export interface State {
  pagination: ExceptionsPagination;
  exceptions: ExceptionListItemSchema[];
  exceptionToEdit: ExceptionListItemSchema | null;
  loadingItemIds: ExceptionListItemIdentifiers[];
  currentModal: ViewerFlyoutName;
  exceptionListTypeToEdit: ExceptionListType | null;
  viewerState: ViewerState;
  exceptionLists: ListArray;
}

export type Action =
  | {
      type: 'setExceptions';
      exceptions: ExceptionListItemSchema[];
      pagination: Pagination;
    }
  | { type: 'updateFlyoutOpen'; flyoutType: ViewerFlyoutName }
  | {
      type: 'updateExceptionToEdit';
      lists: ListArray;
      exception: ExceptionListItemSchema;
    }
  | { type: 'updateLoadingItemIds'; items: ExceptionListItemIdentifiers[] }
  | { type: 'updateExceptionListTypeToEdit'; exceptionListType: ExceptionListType | null }
  | {
      type: 'setViewerState';
      state: ViewerState;
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
      case 'updateLoadingItemIds': {
        return {
          ...state,
          loadingItemIds: [...state.loadingItemIds, ...action.items],
        };
      }
      case 'updateExceptionToEdit': {
        const { exception, lists } = action;
        const exceptionListToEdit = lists.find((list) => {
          return list !== null && exception.list_id === list.list_id;
        });
        return {
          ...state,
          exceptionToEdit: exception,
          exceptionListTypeToEdit: exceptionListToEdit ? exceptionListToEdit.type : null,
        };
      }
      case 'updateFlyoutOpen': {
        return {
          ...state,
          currentModal: action.flyoutType,
        };
      }
      case 'updateExceptionListTypeToEdit': {
        return {
          ...state,
          exceptionListTypeToEdit: action.exceptionListType,
        };
      }
      case 'setViewerState': {
        return {
          ...state,
          viewerState: action.state,
        };
      }
      default:
        return state;
    }
  };
