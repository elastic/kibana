/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalState } from '../index';

const selectAppState = (state: GlobalState) => state.app;

export const coreStartServices = (state: GlobalState) => {
  return selectAppState(state).coreStartServices!;
};

export const appBasePath = (state: GlobalState) => {
  return selectAppState(state).appBasePath;
};
