/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { AgentPolicy } from '@kbn/fleet-plugin/common';
import { IHttpSerializedFetchError } from '../../../apps/synthetics/state';
import {
  getAgentPoliciesAction,
  setAddingNewPrivateLocation,
  setManageFlyoutOpen,
} from './actions';

export interface AgentPoliciesList {
  items: AgentPolicy[];
  total: number;
  page: number;
  perPage: number;
}

export interface AgentPoliciesState {
  data: AgentPoliciesList | null;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
  isManageFlyoutOpen?: boolean;
  isAddingNewPrivateLocation?: boolean;
}

const initialState: AgentPoliciesState = {
  data: null,
  loading: false,
  error: null,
  isManageFlyoutOpen: false,
  isAddingNewPrivateLocation: false,
};

export const agentPoliciesReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getAgentPoliciesAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getAgentPoliciesAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
    })
    .addCase(getAgentPoliciesAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    })
    .addCase(setManageFlyoutOpen, (state, action) => {
      state.isManageFlyoutOpen = action.payload;
    })
    .addCase(setAddingNewPrivateLocation, (state, action) => {
      state.isAddingNewPrivateLocation = action.payload;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
