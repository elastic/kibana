/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

export interface State {
  exceptionItems: ExceptionsBuilderReturnExceptionItem[];
  exceptionItemMeta: { name: string };
  newComment: string;
  bulkCloseAlerts: boolean;
  disableBulkClose: boolean;
  bulkCloseIndex: string[] | undefined;
}

export type Action =
  | {
      type: 'setExceptionItemMeta';
      value: [string, string];
    }
  | {
      type: 'setComment';
      comment: string;
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
      case 'setComment': {
        const { comment } = action;

        return {
          ...state,
          newComment: comment,
        };
      }
      case 'setBulkCloseAlerts': {
        const { bulkClose } = action;

        return {
          ...state,
          bulkCloseAlerts: bulkClose,
        };
      }
      case 'setDisableBulkCloseAlerts': {
        const { disableBulkCloseAlerts } = action;

        return {
          ...state,
          disableBulkClose: disableBulkCloseAlerts,
        };
      }
      case 'setBulkCloseIndex': {
        const { bulkCloseIndex } = action;

        return {
          ...state,
          bulkCloseIndex,
        };
      }
      default:
        return state;
    }
  };
