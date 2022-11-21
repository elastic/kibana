/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeState } from '@kbn/alerting-plugin/common';
import { updateFlappingHistory } from '@kbn/alerting-plugin/server/lib';
import { remove } from 'lodash';
import { WrappedLifecycleRuleState } from './create_lifecycle_executor';

export function getUpdatedFlappingHistory<State extends RuleTypeState = never>(
  alertId: string,
  state: WrappedLifecycleRuleState<State>,
  isNew: boolean,
  isRecovered: boolean,
  isActive: boolean,
  recoveredIds: string[]
) {
  // duplicating this logic to determine flapping at this level
  let flappingHistory: boolean[] = [];
  if (isRecovered) {
    if (state.trackedAlerts[alertId]) {
      // this alert has flapped from active to recovered
      flappingHistory = updateFlappingHistory(state.trackedAlerts[alertId].flappingHistory, true);
    } else if (state.trackedAlertsRecovered[alertId]) {
      // this alert is still recovered
      flappingHistory = updateFlappingHistory(
        state.trackedAlertsRecovered[alertId].flappingHistory,
        false
      );
    }
  } else if (isNew) {
    if (state.trackedAlertsRecovered[alertId]) {
      // this alert has flapped from recovered to active
      flappingHistory = updateFlappingHistory(
        state.trackedAlertsRecovered[alertId].flappingHistory,
        true
      );
      remove(recoveredIds, (id) => id === alertId);
    } else {
      flappingHistory = updateFlappingHistory([], true);
    }
  } else if (isActive) {
    // this alert is still active
    flappingHistory = updateFlappingHistory(state.trackedAlerts[alertId].flappingHistory, false);
  }
  return flappingHistory;
}
