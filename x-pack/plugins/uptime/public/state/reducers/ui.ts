/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import {
  PopoverState,
  toggleIntegrationsPopover,
  setBasePath,
  setEsKueryString,
  UiPayload,
  setAlertFlyoutType,
  setAlertFlyoutVisible,
} from '../actions';

export interface UiState {
  alertFlyoutVisible: boolean;
  alertFlyoutType?: string;
  basePath: string;
  esKuery: string;
  integrationsPopoverOpen: PopoverState | null;
}

const initialState: UiState = {
  alertFlyoutVisible: false,
  basePath: '',
  esKuery: '',
  integrationsPopoverOpen: null,
};

export const uiReducer = handleActions<UiState, UiPayload>(
  {
    [String(toggleIntegrationsPopover)]: (state, action: Action<PopoverState>) => ({
      ...state,
      integrationsPopoverOpen: action.payload as PopoverState,
    }),

    [String(setAlertFlyoutVisible)]: (state, action: Action<boolean | undefined>) => ({
      ...state,
      alertFlyoutVisible: action.payload ?? !state.alertFlyoutVisible,
    }),

    [String(setBasePath)]: (state, action: Action<string>) => ({
      ...state,
      basePath: action.payload as string,
    }),

    [String(setEsKueryString)]: (state, action: Action<string>) => ({
      ...state,
      esKuery: action.payload as string,
    }),

    [String(setAlertFlyoutType)]: (state, action: Action<string>) => ({
      ...state,
      alertFlyoutType: action.payload,
    }),
  },
  initialState
);
