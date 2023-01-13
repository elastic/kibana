/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { ConfigKey, EncryptedSyntheticsSavedMonitor } from '../../../../../common/runtime_types';
import { SyntheticsAppState } from '../root_reducer';

export const selectMonitorListState = (state: SyntheticsAppState) => state.monitorList;
export const selectEncryptedSyntheticsSavedMonitors = createSelector(
  selectMonitorListState,
  (state) =>
    state?.data.monitors.map((monitor) => ({
      ...monitor.attributes,
      id: monitor.attributes[ConfigKey.MONITOR_QUERY_ID],
      updated_at: monitor.updated_at,
      created_at: monitor.created_at,
    })) as EncryptedSyntheticsSavedMonitor[]
);
export const selectMonitorUpsertStatuses = (state: SyntheticsAppState) =>
  state.monitorList.monitorUpsertStatuses;
