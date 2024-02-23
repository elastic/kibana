/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { isStatusEnabled } from '../../../../../common/runtime_types/monitor_management/alert_config';
import { MonitorOverviewState } from './models';

import {
  fetchMonitorOverviewAction,
  setFlyoutConfig,
  setOverviewGroupByAction,
  setOverviewPageStateAction,
  toggleErrorPopoverOpen,
} from './actions';
import { enableMonitorAlertAction } from '../monitor_list/actions';
import { ConfigKey } from '../../components/monitor_add_edit/types';

const initialState: MonitorOverviewState = {
  data: {
    total: 0,
    allMonitorIds: [],
    monitors: [],
  },
  pageState: {
    perPage: 16,
    sortOrder: 'asc',
    sortField: 'status',
  },
  groupBy: { field: 'none', order: 'asc' },
  flyoutConfig: null,
  loading: false,
  loaded: false,
  error: null,
  isErrorPopoverOpen: null,
};

export const monitorOverviewReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchMonitorOverviewAction.get, (state, action) => {
      state.loading = true;
      state.loaded = false;
    })
    .addCase(fetchMonitorOverviewAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
      state.loaded = true;
    })
    .addCase(fetchMonitorOverviewAction.fail, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    .addCase(setOverviewPageStateAction, (state, action) => {
      state.pageState = {
        ...state.pageState,
        ...action.payload,
      };
      state.loaded = false;
    })
    .addCase(setOverviewGroupByAction, (state, action) => {
      state.groupBy = {
        ...state.groupBy,
        ...action.payload,
      };
    })
    .addCase(setFlyoutConfig, (state, action) => {
      state.flyoutConfig = action.payload;
    })
    .addCase(enableMonitorAlertAction.success, (state, action) => {
      const monitorObject = action.payload;
      if (!('errors' in monitorObject)) {
        const isStatusAlertEnabled = isStatusEnabled(monitorObject[ConfigKey.ALERT_CONFIG]);
        state.data.monitors = state.data.monitors.map((monitor) => {
          if (
            monitor.id === monitorObject[ConfigKey.CONFIG_ID] ||
            monitor.id === monitorObject[ConfigKey.MONITOR_QUERY_ID]
          ) {
            return {
              ...monitor,
              isStatusAlertEnabled,
            };
          }
          return monitor;
        });
      }
    })
    .addCase(toggleErrorPopoverOpen, (state, action) => {
      state.isErrorPopoverOpen = action.payload;
    });
});

export * from './models';
export * from './actions';
export * from './effects';
export * from './selectors';
export { fetchMonitorOverview } from './api';
