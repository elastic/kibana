/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';

interface FlappingData {
  flapping: boolean;
  flappingHistory: boolean[];
}

export function determineAlertsToPersist(
  activeAlertData: Record<string, FlappingData>,
  recoveredAlertData: Record<string, FlappingData>
): {
  activeAlertIds: string[];
  recoveredAlertIds: string[];
} {
  const recoveredAlertIds: string[] = [];

  // persist all active alerts regardless of flapping state
  const activeAlertIds = keys(activeAlertData);

  for (const id of keys(recoveredAlertData)) {
    const alertData = recoveredAlertData[id];
    // return recovered alerts if they are flapping or if the flapping array is not at capacity
    // this is a space saving effort that will stop tracking a recovered alert if it wasn't flapping and doesn't have state changes
    // in the last max capcity number of executions
    const numStateChanges = alertData.flappingHistory.filter((f: boolean) => f).length;
    if (alertData.flapping || numStateChanges > 0) {
      recoveredAlertIds.push(id);
    }
  }
  return { activeAlertIds, recoveredAlertIds };
}
