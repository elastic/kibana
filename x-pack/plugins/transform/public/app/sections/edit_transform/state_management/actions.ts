/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';

import type { ProviderProps, State } from './edit_transform_flyout_state';
import { getDefaultState } from './get_default_state';

export const initialize = (_: State, action: PayloadAction<ProviderProps>) =>
  getDefaultState(action.payload.config);

export const setApiError = (state: State, action: PayloadAction<string | undefined>) => {
  state.apiErrorMessage = action.payload;
};
