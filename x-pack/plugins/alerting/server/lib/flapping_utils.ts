/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesSettingsFlapping } from '../../common/rules_settings';

export function updateFlappingHistory(
  flappingSettings: RulesSettingsFlapping,
  flappingHistory: boolean[],
  state: boolean
) {
  if (flappingSettings.enabled) {
    const updatedFlappingHistory = flappingHistory
      .concat(state)
      .slice(flappingSettings.lookBackWindow * -1);
    return updatedFlappingHistory;
  }
  return flappingHistory;
}

export function isFlapping(
  flappingSettings: RulesSettingsFlapping,
  flappingHistory: boolean[],
  isCurrentlyFlapping: boolean = false
): boolean {
  if (flappingSettings.enabled) {
    const numStateChanges = flappingHistory.filter((f) => f).length;
    if (isCurrentlyFlapping) {
      // if an alert is currently flapping,
      // it will return false if the flappingHistory array is at capacity and there are 0 state changes
      // else it will return true
      return !(atCapacity(flappingSettings, flappingHistory) && numStateChanges === 0);
    } else {
      // if an alert is not currently flapping,
      // it will return true if the number of state changes in flappingHistory array >= the flapping status change threshold
      return numStateChanges >= flappingSettings.statusChangeThreshold;
    }
  }
  return false;
}

export function atCapacity(
  flappingSettings: RulesSettingsFlapping,
  flappingHistory: boolean[] = []
): boolean {
  return flappingSettings.enabled && flappingHistory.length >= flappingSettings.lookBackWindow;
}
