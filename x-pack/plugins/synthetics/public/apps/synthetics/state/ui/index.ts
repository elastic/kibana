/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../common/constants/synthetics_alerts';
import { CLIENT_DEFAULTS_SYNTHETICS } from '../../../../../common/constants/synthetics/client_defaults';
import {
  PopoverState,
  toggleIntegrationsPopover,
  setBasePath,
  setEsKueryString,
  setAlertFlyoutVisible,
  setSearchTextAction,
  setSelectedMonitorId,
  setRefreshPausedAction,
  setRefreshIntervalAction,
} from './actions';
const { AUTOREFRESH_INTERVAL_SECONDS, AUTOREFRESH_IS_PAUSED } = CLIENT_DEFAULTS_SYNTHETICS;

export interface UiState {
  alertFlyoutVisible: typeof SYNTHETICS_TLS_RULE | typeof SYNTHETICS_STATUS_RULE | null;
  basePath: string;
  esKuery: string;
  searchText: string;
  integrationsPopoverOpen: PopoverState | null;
  monitorId: string;
  refreshInterval: number;
  refreshPaused: boolean;
}

const initialState: UiState = {
  alertFlyoutVisible: null,
  basePath: '',
  esKuery: '',
  searchText: '',
  integrationsPopoverOpen: null,
  monitorId: '',
  refreshInterval: AUTOREFRESH_INTERVAL_SECONDS,
  refreshPaused: AUTOREFRESH_IS_PAUSED,
};

export const uiReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(toggleIntegrationsPopover, (state, action) => {
      state.integrationsPopoverOpen = action.payload;
    })
    .addCase(setAlertFlyoutVisible, (state, action) => {
      state.alertFlyoutVisible = action.payload;
    })
    .addCase(setBasePath, (state, action) => {
      state.basePath = action.payload;
    })
    .addCase(setEsKueryString, (state, action) => {
      state.esKuery = action.payload;
    })
    .addCase(setSearchTextAction, (state, action) => {
      state.searchText = action.payload;
    })
    .addCase(setSelectedMonitorId, (state, action) => {
      state.monitorId = action.payload;
    })
    .addCase(setRefreshPausedAction, (state, action) => {
      state.refreshPaused = action.payload;
    })
    .addCase(setRefreshIntervalAction, (state, action) => {
      state.refreshInterval = action.payload;
    });
});

export * from './actions';
export * from './selectors';
