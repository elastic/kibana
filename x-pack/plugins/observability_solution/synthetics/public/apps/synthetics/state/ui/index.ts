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
import {
  PopoverState,
  toggleIntegrationsPopover,
  setBasePath,
  setEsKueryString,
  setAlertFlyoutVisible,
  setSearchTextAction,
  setSelectedMonitorId,
} from './actions';

export interface UiState {
  ruleFlyoutVisible: typeof SYNTHETICS_TLS_RULE | typeof SYNTHETICS_STATUS_RULE | null;
  isNewRuleFlyout?: boolean | null;
  basePath: string;
  esKuery: string;
  searchText: string;
  integrationsPopoverOpen: PopoverState | null;
  monitorId: string;
}

const initialState: UiState = {
  isNewRuleFlyout: false,
  ruleFlyoutVisible: null,
  basePath: '',
  esKuery: '',
  searchText: '',
  integrationsPopoverOpen: null,
  monitorId: '',
};

export const uiReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(toggleIntegrationsPopover, (state, action) => {
      state.integrationsPopoverOpen = action.payload;
    })
    .addCase(setAlertFlyoutVisible, (state, action) => {
      state.ruleFlyoutVisible = action.payload?.id ?? null;
      state.isNewRuleFlyout = action.payload?.isNewRuleFlyout ?? null;
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
    });
});

export * from './actions';
export * from './selectors';
