/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { takeLeading } from 'redux-saga/effects';
import { SyntheticsAppState } from '../root_reducer';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { apiService } from '../../../../utils/api_service';
import { API_URLS } from '../../../../../common/constants';
import {
  ServiceLocations,
  ServiceLocationsApiResponseCodec,
  ThrottlingOptions,
} from '../../../../../common/runtime_types';

export interface ServiceLocationsState {
  throttling: ThrottlingOptions | undefined;
  locations: ServiceLocations;
}

export const serviceLocationSlice = createSlice({
  name: 'serviceLocations',
  initialState: {
    locations: [] as ServiceLocations,
    loading: false,
  },
  reducers: {
    fetchServiceLocationsAction: (state, action) => {
      return {
        ...state,
        loading: true,
      };
    },
    fetchServiceLocationsActionSuccess: (state, action: PayloadAction<ServiceLocationsState>) => {
      return {
        ...state,
        loading: false,
        locations: action.payload.locations,
      };
    },
    fetchServiceLocationsActionFail: (state, action) => {
      return {
        ...state,
        loading: false,
        locations: action.payload,
      };
    },
  },
});

export const {
  fetchServiceLocationsAction,
  fetchServiceLocationsActionSuccess,
  fetchServiceLocationsActionFail,
} = serviceLocationSlice.actions;

export const serviceLocationsSelector = (state: SyntheticsAppState) =>
  state.serviceLocations.locations;

export const fetchServiceLocations = async (): Promise<ServiceLocationsState> => {
  const { throttling, locations } = await apiService.get(
    API_URLS.SERVICE_LOCATIONS,
    undefined,
    ServiceLocationsApiResponseCodec
  );
  return { throttling, locations };
};

export function* fetchServiceLocationsEffect() {
  yield takeLeading(
    fetchServiceLocationsAction,
    fetchEffectFactory(
      fetchServiceLocations,
      fetchServiceLocationsActionSuccess,
      fetchServiceLocationsActionFail
    )
  );
}
