/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExceptionsBuilderExceptionItem } from '../types';
import { ExceptionListItemSchema, OperatorTypeEnum } from '../../../../../public/lists_plugin_deps';
import { getDefaultEmptyEntry } from './helpers';

export type ViewerModalName = 'addModal' | 'editModal' | null;

export interface State {
  disableAnd: boolean;
  disableNested: boolean;
  disableOr: boolean;
  andLogicIncluded: boolean;
  addNested: boolean;
  exceptions: ExceptionsBuilderExceptionItem[];
  exceptionsToDelete: ExceptionListItemSchema[];
  errorExists: number;
}

export type Action =
  | {
      type: 'setExceptions';
      exceptions: ExceptionsBuilderExceptionItem[];
    }
  | {
      type: 'setExceptionsToDelete';
      exceptions: ExceptionListItemSchema[];
    }
  | {
      type: 'setDefault';
      initialState: State;
      lastException: ExceptionsBuilderExceptionItem;
    }
  | {
      type: 'setDisableAnd';
      shouldDisable: boolean;
    }
  | {
      type: 'setDisableOr';
      shouldDisable: boolean;
    }
  | {
      type: 'setAddNested';
      addNested: boolean;
    }
  | {
      type: 'setErrorsExist';
      errorExists: boolean;
    };

export const exceptionsBuilderReducer = () => (state: State, action: Action): State => {
  switch (action.type) {
    case 'setExceptions': {
      const isAndLogicIncluded =
        action.exceptions.filter(({ entries }) => entries.length > 1).length > 0;
      const lastExceptionItem = action.exceptions.slice(-1)[0];
      const isAddNested =
        lastExceptionItem != null
          ? lastExceptionItem.entries.slice(-1).filter(({ type }) => type === 'nested').length > 0
          : false;
      const lastEntry = lastExceptionItem != null ? lastExceptionItem.entries.slice(-1)[0] : null;
      const isAndDisabled =
        lastEntry != null && lastEntry.type === 'nested' && lastEntry.entries.length === 0;
      const isOrDisabled = lastEntry != null && lastEntry.type === 'nested';
      const containsValueList = action.exceptions.some(
        ({ entries }) => entries.filter(({ type }) => type === OperatorTypeEnum.LIST).length > 0
      );

      return {
        ...state,
        andLogicIncluded: isAndLogicIncluded,
        exceptions: action.exceptions,
        addNested: isAddNested,
        disableAnd: isAndDisabled,
        disableOr: isOrDisabled,
        disableNested: containsValueList,
      };
    }
    case 'setDefault': {
      return {
        ...state,
        ...action.initialState,
        exceptions: [{ ...action.lastException, entries: [getDefaultEmptyEntry()] }],
      };
    }
    case 'setExceptionsToDelete': {
      return {
        ...state,
        exceptionsToDelete: action.exceptions,
      };
    }
    case 'setDisableAnd': {
      return {
        ...state,
        disableAnd: action.shouldDisable,
      };
    }
    case 'setDisableOr': {
      return {
        ...state,
        disableOr: action.shouldDisable,
      };
    }
    case 'setAddNested': {
      return {
        ...state,
        addNested: action.addNested,
      };
    }
    case 'setErrorsExist': {
      const { errorExists } = state;
      const errTotal = action.errorExists ? errorExists + 1 : errorExists - 1;

      return {
        ...state,
        errorExists: errTotal < 0 ? 0 : errTotal,
      };
    }
    default:
      return state;
  }
};
