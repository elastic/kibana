/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// an in-memory store for flapping processing - just experimenting

import { Logger } from '@kbn/core/server';
import { AlertingConfig } from './config';

export interface FlapState {
  isFlapping: boolean;
  isPreFlapping: boolean;
  previousIsFlapping: boolean;
  activeRuns: boolean[];
}

const FlapStateStore: Map<string, Map<string, FlapState>> = new Map();
let Config: AlertingConfig;
let logger: Logger;

export function configureFlapping(config: AlertingConfig, logger_: Logger): void {
  Config = config;
  logger = logger_;
}

// return flapping alerts
export async function getFlappingAlerts(ruleId: string): Promise<string[]> {
  const flappingAlerts: string[] = [];

  for (const [alertId, alert] of getAlerts(ruleId)) {
    if (alert.isFlapping) {
      flappingAlerts.push(alertId);
    }
  }

  return flappingAlerts;
}

// update the flapping state of the alerts of a rule, map of alerts -> flap state
export async function updateFlappingState(
  ruleId: string,
  activeAlerts: string[],
  recoveredAlerts: string[]
): Promise<Map<string, FlapState>> {
  const activeRuns: Map<string, boolean> = new Map();

  for (const alertId of activeAlerts) {
    activeRuns.set(alertId, true);
  }

  for (const alertId of recoveredAlerts) {
    activeRuns.set(alertId, false);
  }

  const preFlappingAlerts = getPreFlappingAlerts(ruleId);
  for (const alertId of preFlappingAlerts) {
    if (!activeRuns.has(alertId)) {
      activeRuns.set(alertId, false);
    }
  }

  const result = new Map<string, FlapState>();

  for (const [alertId, active] of activeRuns) {
    result.set(alertId, await updateAlertFlapState(ruleId, alertId, active));
  }

  return result;
}

function getFlapState(ruleId: string, alertId: string): FlapState {
  const alerts = getAlerts(ruleId);
  const flapState = alerts.get(alertId);
  if (flapState) return flapState;

  const newFlapState: FlapState = {
    activeRuns: [],
    isFlapping: false,
    isPreFlapping: false,
    previousIsFlapping: false,
  };

  alerts.set(alertId, newFlapState);
  return newFlapState;
}

async function updateAlertFlapState(
  ruleId: string,
  alertId: string,
  active: boolean
): Promise<FlapState> {
  // logger.info(`updateAlertFlapState(${ruleId}, ${alertId}, ${active})`);
  const flapState = getFlapState(ruleId, alertId);
  const lookBack = Config.rules.flapping.lookBack;
  const activeRuns = flapState.activeRuns;

  if (active) {
    flapState.isPreFlapping = true;
  }

  flapState.previousIsFlapping = flapState.isFlapping;

  // add new status, trim history if needed
  activeRuns.push(active);
  while (activeRuns.length > lookBack) activeRuns.shift();

  // count flaps
  const currentCount = countFlaps(activeRuns);
  // logger.info(`rule: ${ruleId}; alert: ${alertId}; flapCount: ${currentCount}`);
  if (currentCount >= Config.rules.flapping.count) {
    flapState.isFlapping = true;
  }

  // if flapping, have we finished quiet time?
  if (flapState.isFlapping) {
    // remove quietTime entries from the end, stop flapping if none active
    const lastActive = activeRuns.slice(-Config.rules.flapping.quietTime);
    const lastActiveSet = new Set(lastActive);
    if (!lastActiveSet.has(true)) {
      logger.info(`rule: ${ruleId} alert: ${alertId} no longer flapping`);
      flapState.isPreFlapping = false;
      flapState.isFlapping = false;
      flapState.activeRuns = [];
    }
  }

  if (flapState.previousIsFlapping !== flapState.isFlapping) {
    const which = flapState.previousIsFlapping ? 'finished' : 'starting';
    const message = `alert is ${which} flapping: rule: ${ruleId}; alertId: ${alertId}`;
    logger.info(message);
  }

  return flapState;
}

function countFlaps(activeRuns: boolean[]): number {
  let flaps = 0;

  let prev = activeRuns[0];
  for (const curr of activeRuns.slice(1)) {
    if (prev !== curr) {
      flaps++;
    }
    prev = curr;
  }

  return flaps;
}

function getPreFlappingAlerts(ruleId: string): string[] {
  const preFlappingAlerts: string[] = [];

  for (const [alertId, alert] of getAlerts(ruleId)) {
    if (alert.isPreFlapping) {
      preFlappingAlerts.push(alertId);
    }
  }

  return preFlappingAlerts;
}

function getAlerts(ruleId: string): Map<string, FlapState> {
  const alerts = FlapStateStore.get(ruleId);
  if (alerts) return alerts;

  const newAlerts = new Map<string, FlapState>();
  FlapStateStore.set(ruleId, newAlerts);
  return newAlerts;
}
