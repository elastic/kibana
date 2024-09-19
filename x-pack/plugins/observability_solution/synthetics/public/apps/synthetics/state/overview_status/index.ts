/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { enableMonitorAlertAction } from '../monitor_list/actions';
import { isStatusEnabled } from '../../../../../common/runtime_types/monitor_management/alert_config';
import {
  ConfigKey,
  OverviewPendingStatusMetaData,
  OverviewStatusMetaData,
  OverviewStatusState,
} from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '..';
import {
  clearOverviewStatusErrorAction,
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
} from './actions';

export interface OverviewStatusStateReducer {
  loading: boolean;
  loaded: boolean;
  status: OverviewStatusState | null;
  allConfigs?: Array<OverviewStatusMetaData | OverviewPendingStatusMetaData>;
  disabledConfigs?: Array<OverviewStatusMetaData | OverviewPendingStatusMetaData>;
  sortedByStatus?: OverviewStatusMetaData[];
  error: IHttpSerializedFetchError | null;
}

const initialState: OverviewStatusStateReducer = {
  loading: false,
  loaded: false,
  status: null,
  error: null,
};

export const overviewStatusReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchOverviewStatusAction.get, (state) => {
      state.status = null;
      state.loading = true;
    })
    .addCase(quietFetchOverviewStatusAction.get, (state) => {
      state.loading = true;
    })
    .addCase(fetchOverviewStatusAction.success, (state, action) => {
      state.status = action.payload;
      state.allConfigs = Object.values({
        ...action.payload.upConfigs,
        ...action.payload.downConfigs,
        ...action.payload.pendingConfigs,
      });
      state.disabledConfigs = state.allConfigs.filter((monitor) => !monitor.isEnabled);
      state.loaded = true;
      state.loading = false;
    })
    .addCase(fetchOverviewStatusAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    })
    .addCase(enableMonitorAlertAction.success, (state, action) => {
      const monitorObject = action.payload;
      if (!('errors' in monitorObject)) {
        const isStatusAlertEnabled = isStatusEnabled(monitorObject[ConfigKey.ALERT_CONFIG]);
        state.allConfigs = state.allConfigs?.map((monitor) => {
          if (
            monitor.configId === monitorObject[ConfigKey.CONFIG_ID] ||
            monitor.monitorQueryId === monitorObject[ConfigKey.MONITOR_QUERY_ID]
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
    .addCase(clearOverviewStatusErrorAction, (state) => {
      state.error = null;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
