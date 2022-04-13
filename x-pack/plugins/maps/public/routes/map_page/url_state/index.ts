/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { MapsGlobalState } from './global_sync';
export { getGlobalState, updateGlobalState, startGlobalStateSyncing } from './global_sync';
export type { MapsAppState } from './app_state_manager';
export { AppStateManager } from './app_state_manager';
export { startAppStateSyncing } from './app_sync';
