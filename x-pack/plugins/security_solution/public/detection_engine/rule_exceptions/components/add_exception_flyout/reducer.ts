/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema, OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type {
  ExceptionsBuilderExceptionItem,
  ExceptionsBuilderReturnExceptionItem,
} from '@kbn/securitysolution-list-utils';

import type { Rule } from '../../../rule_management/logic/types';

export interface State {
  exceptionItemMeta: { name: string };
  listType: ExceptionListTypeEnum;
  initialItems: ExceptionsBuilderExceptionItem[];
  exceptionItems: ExceptionsBuilderReturnExceptionItem[];
  newComment: string;
  addExceptionToRadioSelection: string;
  itemConditionValidationErrorExists: boolean;
  closeSingleAlert: boolean;
  bulkCloseAlerts: boolean;
  disableBulkClose: boolean;
  bulkCloseIndex: string[] | undefined;
  selectedOs: OsTypeArray | undefined;
  exceptionListsToAddTo: ExceptionListSchema[];
  selectedRulesToAddTo: Rule[];
  errorSubmitting: Error | null;
}

export const initialState: State = {
  initialItems: [],
  exceptionItems: [],
  exceptionItemMeta: { name: '' },
  newComment: '',
  itemConditionValidationErrorExists: false,
  closeSingleAlert: false,
  bulkCloseAlerts: false,
  disableBulkClose: false,
  bulkCloseIndex: undefined,
  selectedOs: undefined,
  exceptionListsToAddTo: [],
  addExceptionToRadioSelection: 'add_to_rule',
  selectedRulesToAddTo: [],
  listType: ExceptionListTypeEnum.RULE_DEFAULT,
  errorSubmitting: null,
};

export type Action =
  | {
      type: 'setExceptionItemMeta';
      value: [string, string];
    }
  | {
      type: 'setInitialExceptionItems';
      items: ExceptionsBuilderExceptionItem[];
    }
  | {
      type: 'setExceptionItems';
      items: ExceptionsBuilderReturnExceptionItem[];
    }
  | {
      type: 'setConditionValidationErrorExists';
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
      type: 'setSelectedOsOptions';
      selectedOs: OsTypeArray | undefined;
    }
  | {
      type: 'setAddExceptionToLists';
      listsToAddTo: ExceptionListSchema[];
    }
  | {
      type: 'setListOrRuleRadioOption';
      option: string;
    }
  | {
      type: 'setSelectedRulesToAddTo';
      rules: Rule[];
    }
  | {
      type: 'setListType';
      listType: ExceptionListTypeEnum;
    }
  | {
      type: 'setErrorSubmitting';
      err: Error | null;
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
      case 'setInitialExceptionItems': {
        const { items } = action;

        return {
          ...state,
          initialItems: items,
        };
      }
      case 'setExceptionItems': {
        const { items } = action;

        return {
          ...state,
          exceptionItems: items,
        };
      }
      case 'setConditionValidationErrorExists': {
        const { errorExists } = action;

        return {
          ...state,
          itemConditionValidationErrorExists: errorExists,
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
      case 'setSelectedOsOptions': {
        const { selectedOs } = action;

        return {
          ...state,
          selectedOs,
        };
      }
      case 'setAddExceptionToLists': {
        const { listsToAddTo } = action;

        return {
          ...state,
          exceptionListsToAddTo: listsToAddTo,
        };
      }
      case 'setListOrRuleRadioOption': {
        const { option } = action;

        return {
          ...state,
          addExceptionToRadioSelection: option,
          listType:
            option === 'add_to_lists'
              ? ExceptionListTypeEnum.DETECTION
              : ExceptionListTypeEnum.RULE_DEFAULT,
          selectedRulesToAddTo: option === 'add_to_lists' ? [] : state.selectedRulesToAddTo,
        };
      }
      case 'setSelectedRulesToAddTo': {
        const { rules } = action;

        return {
          ...state,
          selectedRulesToAddTo: rules,
        };
      }
      case 'setListType': {
        const { listType } = action;

        return {
          ...state,
          listType,
        };
      }
      case 'setDisableBulkCloseAlerts': {
        const { disableBulkCloseAlerts } = action;

        return {
          ...state,
          disableBulkClose: disableBulkCloseAlerts,
        };
      }
      case 'setErrorSubmitting': {
        const { err } = action;

        return {
          ...state,
          errorSubmitting: err,
        };
      }
      default:
        return state;
    }
  };
