/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { CLIENT_DEFAULTS } from '../../../common/constants';
import {
  PopoverState,
  toggleIntegrationsPopover,
  setBasePath,
  setEsKueryString,
  UiPayload,
  setAlertFlyoutType,
  setAlertFlyoutVisible,
  setSearchTextAction,
  setDateRange,
} from '../actions';

const { DATE_RANGE_START, DATE_RANGE_END } = CLIENT_DEFAULTS;

export interface UiState {
  alertFlyoutVisible: boolean;
  alertFlyoutType?: string;
  basePath: string;
  dateRange: {
    from: string;
    to: string;
  };
  esKuery: string;
  searchText: string;
  integrationsPopoverOpen: PopoverState | null;
}

const initialState: UiState = {
  alertFlyoutVisible: false,
  basePath: '',
  dateRange: {
    from: DATE_RANGE_START,
    to: DATE_RANGE_END,
  },
  esKuery: '',
  searchText: '',
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

    [String(setSearchTextAction)]: (state, action: Action<string>) => ({
      ...state,
      searchText: action.payload,
    }),

    [String(setDateRange)]: (state, action: Action<{ from: string; to: string }>) => ({
      ...state,
      dateRange: action.payload,
    }),
  },
  initialState
);
