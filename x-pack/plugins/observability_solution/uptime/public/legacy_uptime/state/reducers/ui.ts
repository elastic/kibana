/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action, handleActions } from 'redux-actions';
import {
  PopoverState,
  UiPayload,
  setAlertFlyoutType,
  setAlertFlyoutVisible,
  setBasePath,
  setEsKueryString,
  setSearchTextAction,
  setSelectedMonitorId,
  toggleIntegrationsPopover,
} from '../actions';

export interface UiState {
  alertFlyoutVisible: boolean;
  alertFlyoutType?: string;
  basePath: string;
  esKuery: string;
  searchText: string;
  integrationsPopoverOpen: PopoverState | null;
  monitorId: string;
}

const initialState: UiState = {
  alertFlyoutVisible: false,
  basePath: '',
  esKuery: '',
  searchText: '',
  integrationsPopoverOpen: null,
  monitorId: '',
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

    [String(setSearchTextAction)]: (state, action: Action<string>) => ({
      ...state,
      searchText: action.payload,
    }),
    [String(setSelectedMonitorId)]: (state, action: Action<string>) => ({
      ...state,
      monitorId: action.payload,
    }),
  },
  initialState
);
