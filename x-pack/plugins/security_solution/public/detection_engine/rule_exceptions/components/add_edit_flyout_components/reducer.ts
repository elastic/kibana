/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  CreateRuleExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';
import type { AddToRuleListsRadioOptions } from './list_options';

export interface State {
  exceptionItemMeta: { name: string };
  exceptionItems: Array<
    ExceptionListItemSchema | CreateExceptionListItemSchema | CreateRuleExceptionListItemSchema
  >;
  errorsExist: boolean;
  newComment: string;
  closeSingleAlert: boolean;
  bulkCloseAlerts: boolean;
  disableBulkClose: boolean;
  bulkCloseIndex: string[] | undefined;
  selectedListsToAddTo: any[];
  selectedOs: OsTypeArray | undefined;
  addExceptionToRule: boolean;
  exceptionListsToAddTo: ExceptionListSchema[];
  selectedRulesToAddTo: Rule[];
  listsOptionsRadioSelection: AddToRuleListsRadioOptions;
}

export type Action =
  | {
      type: 'setExceptionItemMeta';
      value: [string, string];
    }
  | {
      type: 'setExceptionItems';
      items: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
    }
  | {
      type: 'setErrorsExist';
      errorExists: boolean;
    }
  | {
      type: 'setComment';
      comment: string;
    }
  | {
      type: 'setCloseSingleAlert';
      close: boolean;
    }
  | {
      type: 'setBulkCloseAlerts';
      bulkClose: boolean;
    }
  | {
      type: 'setDisableBulkCloseAlerts';
      disableBulkCloseAlerts: boolean;
    }
  | {
      type: 'setBulkCloseIndex';
      bulkCloseIndex: string[] | undefined;
    }
  | {
      type: 'setSelectedListsToAddTo';
      selectedLists: any[];
    }
  | {
      type: 'setSelectedOsOptions';
      selectedOs: OsTypeArray | undefined;
    }
  | {
      type: 'setAddExceptionToRule';
      addExceptionToRule: boolean;
    }
  | {
      type: 'setAddExceptionToLists';
      listsToAddTo: ExceptionListSchema[];
    }
  | {
      type: 'setListsRadioOption';
      option: AddToRuleListsRadioOptions;
    }
  | {
      type: 'setSelectedRulesToAddTo';
      rules: Rule[];
    };

export const createExceptionItemsReducer =
  () =>
  (state: State, action: Action): State => {
    switch (action.type) {
      case 'setExceptionItemMeta': {
        const { value } = action;

        return {
          ...state,
          exceptionItemMeta: {
            ...state.exceptionItemMeta,
            [value[0]]: value[1],
          },
        };
      }
      case 'setExceptionItems': {
        const { items } = action;

        return {
          ...state,
          exceptionItems: items,
        };
      }
      case 'setErrorsExist': {
        const { errorExists } = action;

        return {
          ...state,
          errorsExist: errorExists,
        };
      }
      case 'setComment': {
        const { comment } = action;

        return {
          ...state,
          newComment: comment,
        };
      }
      case 'setCloseSingleAlert': {
        const { close } = action;

        return {
          ...state,
          closeSingleAlert: close,
        };
      }
      case 'setBulkCloseAlerts': {
        const { bulkClose } = action;

        return {
          ...state,
          bulkCloseAlerts: bulkClose,
        };
      }
      case 'setBulkCloseIndex': {
        const { bulkCloseIndex } = action;

        return {
          ...state,
          bulkCloseIndex,
        };
      }
      case 'setSelectedListsToAddTo': {
        const { selectedLists } = action;

        return {
          ...state,
          selectedListsToAddTo: selectedLists,
        };
      }
      case 'setSelectedOsOptions': {
        const { selectedOs } = action;

        return {
          ...state,
          selectedOs,
        };
      }
      case 'setAddExceptionToRule': {
        const { addExceptionToRule } = action;

        return {
          ...state,
          addExceptionToRule,
        };
      }
      case 'setAddExceptionToLists': {
        const { listsToAddTo } = action;

        return {
          ...state,
          exceptionListsToAddTo: listsToAddTo,
        };
      }
      case 'setListsRadioOption': {
        const { option } = action;

        return {
          ...state,
          listsOptionsRadioSelection: option,
        };
      }
      case 'setSelectedRulesToAddTo': {
        const { rules } = action;

        return {
          ...state,
          selectedRulesToAddTo: rules,
        };
      }
      default:
        return state;
    }
  };
