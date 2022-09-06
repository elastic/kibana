/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { IHttpFetchError } from '@kbn/core/public';
import { createAsyncAction, Nullable } from '../utils/actions';
import { ServiceLocations, ThrottlingOptions } from '../../../../../common/runtime_types';

export const fetchServiceLocationsAction = createAsyncAction<void, ServiceLocationsState>(
  'fetchServiceLocationsAction'
);

export interface ServiceLocationsState {
  throttling: ThrottlingOptions | undefined;
  locations: ServiceLocations;
}

export const serviceLocationReducer = createReducer(
  {
    locations: [] as ServiceLocations,
    loading: false,
    error: null as Nullable<IHttpFetchError>,
  },
  (builder) => {
    builder
      .addCase(fetchServiceLocationsAction.get, (state, action) => {
        state.loading = true;
      })
      .addCase(
        fetchServiceLocationsAction.success,
        (state, action: PayloadAction<ServiceLocationsState>) => {
          state.loading = false;
          state.locations = action.payload.locations;
        }
      )
      .addCase(fetchServiceLocationsAction.fail, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
);
