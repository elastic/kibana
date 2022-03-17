/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import {
  getMonitors,
  getMonitorsSuccess,
  getMonitorsFailure,
  getServiceLocations,
  getServiceLocationsSuccess,
  getServiceLocationsFailure,
  getSyntheticsServiceAllowed,
} from '../actions';

import { SyntheticsServiceAllowed } from '../../../common/types';

import {
  MonitorManagementListResult,
  ServiceLocations,
  ThrottlingOptions,
  BandwidthLimitKey,
  DEFAULT_BANDWIDTH_LIMIT,
} from '../../../common/runtime_types';

export interface MonitorManagementList {
  error: Record<'monitorList' | 'serviceLocations', Error | null>;
  loading: Record<'monitorList' | 'serviceLocations', boolean>;
  list: MonitorManagementListResult;
  locations: ServiceLocations;
  syntheticsService: { isAllowed?: boolean; loading: boolean };
  throttling: ThrottlingOptions;
}

const defaultThrottling = {
  [BandwidthLimitKey.DOWNLOAD]: DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.DOWNLOAD],
  [BandwidthLimitKey.UPLOAD]: DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.UPLOAD],
  [BandwidthLimitKey.LATENCY]: DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.LATENCY],
};

export const initialState: MonitorManagementList = {
  list: {
    page: 1,
    perPage: 10,
    total: null,
    monitors: [],
  },
  locations: [],
  loading: {
    monitorList: false,
    serviceLocations: false,
  },
  error: {
    monitorList: null,
    serviceLocations: null,
  },
  syntheticsService: {
    loading: false,
  },
  throttling: defaultThrottling,
};

export const monitorManagementListReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getMonitors, (state: WritableDraft<MonitorManagementList>) => ({
      ...state,
      loading: {
        ...state.loading,
        monitorList: true,
      },
    }))
    .addCase(
      getMonitorsSuccess,
      (
        state: WritableDraft<MonitorManagementList>,
        action: PayloadAction<MonitorManagementListResult>
      ) => ({
        ...state,
        loading: {
          ...state.loading,
          monitorList: false,
        },
        error: {
          ...state.error,
          monitorList: null,
        },
        list: { ...action.payload },
      })
    )
    .addCase(
      getMonitorsFailure,
      (state: WritableDraft<MonitorManagementList>, action: PayloadAction<Error>) => ({
        ...state,
        loading: {
          ...state.loading,
          monitorList: false,
        },
        error: {
          ...state.error,
          monitorList: action.payload,
        },
      })
    )
    .addCase(getServiceLocations, (state: WritableDraft<MonitorManagementList>) => ({
      ...state,
      loading: {
        ...state.loading,
        serviceLocations: true,
      },
    }))
    .addCase(
      getServiceLocationsSuccess,
      (
        state: WritableDraft<MonitorManagementList>,
        action: PayloadAction<{
          throttling: ThrottlingOptions | undefined;
          locations: ServiceLocations;
        }>
      ) => ({
        ...state,
        loading: {
          ...state.loading,
          serviceLocations: false,
        },
        error: {
          ...state.error,
          serviceLocations: null,
        },
        locations: action.payload.locations,
        throttling: action.payload.throttling || defaultThrottling,
      })
    )
    .addCase(
      getServiceLocationsFailure,
      (state: WritableDraft<MonitorManagementList>, action: PayloadAction<Error>) => ({
        ...state,
        loading: {
          ...state.loading,
          serviceLocations: false,
        },
        error: {
          ...state.error,
          serviceLocations: action.payload,
        },
      })
    )
    .addCase(
      String(getSyntheticsServiceAllowed.get),
      (state: WritableDraft<MonitorManagementList>) => ({
        ...state,
        syntheticsService: {
          isAllowed: state.syntheticsService?.isAllowed,
          loading: true,
        },
      })
    )
    .addCase(
      String(getSyntheticsServiceAllowed.success),
      (
        state: WritableDraft<MonitorManagementList>,
        action: PayloadAction<SyntheticsServiceAllowed>
      ) => ({
        ...state,
        syntheticsService: {
          isAllowed: action.payload.serviceAllowed,
          loading: false,
        },
      })
    )
    .addCase(
      String(getSyntheticsServiceAllowed.fail),
      (state: WritableDraft<MonitorManagementList>, action: PayloadAction<Error>) => ({
        ...state,
        syntheticsService: {
          isAllowed: false,
          loading: false,
        },
      })
    );
});
