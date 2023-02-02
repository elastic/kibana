/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import {
  PopoverState,
  toggleIntegrationsPopover,
  setBasePath,
  setEsKueryString,
  setAlertFlyoutType,
  setAlertFlyoutVisible,
  setSearchTextAction,
  setSelectedMonitorId,
} from './actions';

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

export const uiReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(toggleIntegrationsPopover, (state, action) => {
      state.integrationsPopoverOpen = action.payload;
    })
    .addCase(setAlertFlyoutVisible, (state, action) => {
      state.alertFlyoutVisible = action.payload ?? !state.alertFlyoutVisible;
    })
    .addCase(setAlertFlyoutType, (state, action) => {
      state.alertFlyoutType = action.payload;
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
