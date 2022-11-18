/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeState } from '@kbn/alerting-plugin/common';
import { drop, remove } from 'lodash';
import { WrappedLifecycleRuleState } from './create_lifecycle_executor';

const MAX_CAPACITY = 20;
const MAX_FLAP_COUNT = 4;

export function updateFlappingHistory(flappingHistory: boolean[], state: boolean) {
  if (atCapacity(flappingHistory)) {
    const diff = getCapacityDiff(flappingHistory);
    // drop old flapping states to make space for the next state
    flappingHistory = drop(flappingHistory, diff);
  }
  flappingHistory.push(state);
  return flappingHistory;
}

export function isFlapping(
  flappingHistory: boolean[],
  isCurrentlyFlapping: boolean = false
): boolean {
  const numStateChanges = flappingHistory.filter((f) => f).length;
  if (isCurrentlyFlapping) {
    // if an alert is currently flapping,
    // it will return false if the flappingHistory array is at capacity and there are 0 state changes
    // else it will return true
    return !(atCapacity(flappingHistory) && numStateChanges === 0);
  } else {
    // if an alert is not currently flapping,
    // it will return true if the number of state changes in flappingHistory array >= the max flapping count
    return numStateChanges >= MAX_FLAP_COUNT;
  }
}

export function atCapacity(flappingHistory: boolean[] = []): boolean {
  return flappingHistory.length >= MAX_CAPACITY;
}

export function getCapacityDiff(flappingHistory: boolean[] = []) {
  const len = flappingHistory.length;
  // adding + 1 to make space for next the flapping state
  return len + 1 - MAX_CAPACITY;
}

export function getFlappingHistory<State extends RuleTypeState = never>(
  alertId: string,
  state: WrappedLifecycleRuleState<State>,
  isNew: boolean,
  isRecovered: boolean,
  isActive: boolean,
  recoveredIds: string[]
) {
  // duplicating this logic to determine flapping at this level
  let flappingHistory: boolean[] = [];
  if (isNew) {
    flappingHistory = updateFlappingHistory([], true);
  } else if (isActive) {
    if (!state.trackedAlerts[alertId] && state.trackedAlertsRecovered[alertId]) {
      // this alert has flapped from recovered to active
      flappingHistory = updateFlappingHistory(
        state.trackedAlertsRecovered[alertId].flappingHistory,
        true
      );
      remove(recoveredIds, (id) => id === alertId);
    } else {
      // this alert is still active
      flappingHistory = updateFlappingHistory(state.trackedAlerts[alertId].flappingHistory, false);
    }
  } else if (isRecovered) {
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
  }
  return flappingHistory;
}
