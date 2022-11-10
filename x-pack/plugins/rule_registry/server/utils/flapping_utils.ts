/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { drop } from 'lodash';

const MAX_CAPACITY = 20;
const MAX_FLAP_COUNT = 4;

export function updateFlappingHistory(flappingHistory: boolean[], state: boolean) {
  if (atCapacity(flappingHistory)) {
    const diff = getCapcityDiff(flappingHistory);
    flappingHistory = drop(flappingHistory, diff);
  }
  flappingHistory.push(state);
  return flappingHistory;
}

export function isFlapping(flappingHistory: boolean[]): boolean {
  if (atCapacity(flappingHistory)) {
    const numStateChanges = flappingHistory.filter((f) => f).length;
    return numStateChanges >= MAX_FLAP_COUNT;
  }
  return false;
}

export function atCapacity(flappingHistory: boolean[] = []): boolean {
  return flappingHistory.length >= MAX_CAPACITY;
}

export function getCapcityDiff(flappingHistory: boolean[] = []) {
  const len = flappingHistory.length;
  return len + 1 - MAX_CAPACITY;
}
