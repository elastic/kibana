/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_CAPACITY = 20;
const MAX_FLAP_COUNT = 4;

export function updateFlappingHistory(flappingHistory: boolean[], state: boolean) {
  const updatedFlappingHistory = flappingHistory.concat(state).slice(MAX_CAPACITY * -1);
  return updatedFlappingHistory;
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
