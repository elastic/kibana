/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { PingStatus } from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError } from '../utils/http_error';

import { getMonitorPingStatusesAction } from './actions';

export interface PingStatusState {
  pingStatuses: {
    [monitorId: string]: {
      [locationId: string]: {
        [timestamp: string]: PingStatus;
      };
    };
  };
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialState: PingStatusState = {
  pingStatuses: {},
  loading: false,
  error: null,
};

export const pingStatusReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getMonitorPingStatusesAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getMonitorPingStatusesAction.success, (state, action) => {
      (action.payload.pings ?? []).forEach((ping) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { config_id, locationId, timestamp } = ping;
        if (!state.pingStatuses[config_id]) {
          state.pingStatuses[config_id] = {};
        }

        if (!state.pingStatuses[config_id][locationId]) {
          state.pingStatuses[config_id][locationId] = {};
        }

        state.pingStatuses[config_id][locationId][timestamp] = ping;
      });

      state.loading = false;
    })
    .addCase(getMonitorPingStatusesAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
