/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';

export interface State {
  selectableAlertTags: EuiSelectableOption[];
  tagsToAdd: Set<string>;
  tagsToRemove: Set<string>;
}

export const initialState: State = {
  selectableAlertTags: [],
  tagsToAdd: new Set<string>(),
  tagsToRemove: new Set<string>(),
};

export type Action =
  | {
      type: 'addAlertTag';
      value: string;
    }
  | {
      type: 'removeAlertTag';
      value: string;
    }
  | {
      type: 'setSelectableAlertTags';
      value: EuiSelectableOption[];
    };

export const createAlertTagsReducer =
  () =>
  (state: State, action: Action): State => {
    switch (action.type) {
      case 'addAlertTag': {
        const { value } = action;
        state.tagsToAdd.add(value);
        state.tagsToRemove.delete(value);
        return state;
      }
      case 'removeAlertTag': {
        const { value } = action;
        state.tagsToRemove.add(value);
        state.tagsToAdd.delete(value);
        return state;
      }
      case 'setSelectableAlertTags': {
        const { value } = action;
        return { ...state, selectableAlertTags: value };
      }
      default:
        return state;
    }
  };
