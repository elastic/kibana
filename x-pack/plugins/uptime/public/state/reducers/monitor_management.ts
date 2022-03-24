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
} from '../actions';
import { MonitorManagementListResult, ServiceLocations } from '../../../common/runtime_types';

export interface MonitorManagementList {
  error: Record<'monitorList' | 'serviceLocations', Error | null>;
  loading: Record<'monitorList' | 'serviceLocations', boolean>;
  list: MonitorManagementListResult;
  locations: ServiceLocations;
}

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
      (state: WritableDraft<MonitorManagementList>, action: PayloadAction<ServiceLocations>) => ({
        ...state,
        loading: {
          ...state.loading,
          serviceLocations: false,
        },
        error: {
          ...state.error,
          serviceLocations: null,
        },
        locations: action.payload,
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
    );
});
