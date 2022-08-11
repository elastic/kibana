/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// an in-memory store for flapping processing - just experimenting

import { Logger } from '@kbn/core/server';
import { AlertingConfig } from './config';

interface FlapState {
  isFlapping: boolean;
  previousIsFlapping: boolean;
  activeRuns: boolean[];
}

const FlapStateStore: Map<string, Map<string, FlapState>> = new Map();
let Config: AlertingConfig;
let Logger: Logger;

export function configureFlapping(config: AlertingConfig, logger: Logger): void {
  Config = config;
  Logger = logger;
}

export async function getFlapState(ruleId: string, alertId: string): Promise<FlapState> {
  const alerts = getAlerts(ruleId);
  const flapState = alerts.get(alertId);
  if (flapState) return flapState;

  const newFlapState: FlapState = {
    activeRuns: [],
    isFlapping: false,
    previousIsFlapping: false,
  };

  alerts.set(alertId, newFlapState);
  return newFlapState;
}

interface UpdateFlapState {
  isFlapping: boolean;
  previousIsFlapping: boolean;
}

export async function updateFlapState(
  ruleId: string,
  alertId: string,
  active: boolean
): Promise<UpdateFlapState> {
  const flapState = await getFlapState(ruleId, alertId);
  const lookBack = Config.rules.flapping.lookBack;
  const activeRuns = flapState.activeRuns;

  flapState.previousIsFlapping = flapState.isFlapping;

  // add new status, trim history if needed
  activeRuns.push(active);
  while (activeRuns.length > lookBack) activeRuns.shift();

  // count flaps
  const currentCount = countFlaps(activeRuns);
  if (currentCount >= Config.rules.flapping.count) {
    flapState.isFlapping = true;
  }

  // if flapping, have we finished quiet time?
  if (flapState.isFlapping) {
    // remove quietTime entries from the end, stop flapping if none active
    const lastRuns = activeRuns.slice(-Config.rules.flapping.quietTime);
    const lastRunsSet = new Set(lastRuns);
    if (!lastRunsSet.has(true)) {
      flapState.isFlapping = false;
    }
  }

  if (flapState.previousIsFlapping !== flapState.isFlapping) {
    const which = flapState.previousIsFlapping ? 'finished' : 'starting';
    const message = `alert is ${which} flapping: rule: ${ruleId}; alertId: ${alertId}`;
    Logger.info(message);
  }

  return flapState;
}

function countFlaps(activeRuns: boolean[]): number {
  let flaps = 0;

  // loop from start to next-to-last, comparing neighbors
  for (let i = 0; i < activeRuns.length - 1; i++) {
    if (activeRuns[i] !== activeRuns[i + 1]) flaps++;
  }

  return flaps;
}

function getAlerts(ruleId: string): Map<string, FlapState> {
  const alerts = FlapStateStore.get(ruleId);
  if (alerts) return alerts;

  const newAlerts = new Map<string, FlapState>();
  FlapStateStore.set(ruleId, newAlerts);
  return newAlerts;
}
