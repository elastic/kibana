/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLLING_THRESHOLD_MS } from '../constants';
import type { Agent, AgentStatus } from '../types';

const offlineTimeoutIntervalCount = 10; // 30s*10 = 5m timeout

export function getAgentStatus(agent: Agent): AgentStatus {
  const { last_checkin: lastCheckIn } = agent;

  if (!agent.active) {
    return 'inactive';
  }
  if (agent.unenrollment_started_at && !agent.unenrolled_at) {
    return 'unenrolling';
  }
  if (!agent.last_checkin) {
    return 'enrolling';
  }

  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();
  const msSinceLastCheckIn = new Date().getTime() - msLastCheckIn;
  const intervalsSinceLastCheckIn = Math.floor(msSinceLastCheckIn / AGENT_POLLING_THRESHOLD_MS);

  if (agent.last_checkin_status === 'error') {
    return 'error';
  }
  if (agent.last_checkin_status === 'degraded') {
    return 'degraded';
  }
  if (agent.upgrade_started_at && !agent.upgraded_at) {
    return 'updating';
  }
  if (intervalsSinceLastCheckIn >= offlineTimeoutIntervalCount) {
    return 'offline';
  }

  return 'online';
}

export function buildKueryForEnrollingAgents(path: string = '') {
  return `not (${path}last_checkin:*)`;
}

export function buildKueryForUnenrollingAgents(path: string = '') {
  return `${path}unenrollment_started_at:*`;
}

export function buildKueryForOnlineAgents(path: string = '') {
  return `not (${buildKueryForOfflineAgents(path)}) AND not (${buildKueryForErrorAgents(
    path
  )}) AND not (${buildKueryForUpdatingAgents(path)})`;
}

export function buildKueryForErrorAgents(path: string = '') {
  return `(${path}last_checkin_status:error or ${path}last_checkin_status:degraded) AND not (${buildKueryForUpdatingAgents(
    path
  )})`;
}

export function buildKueryForOfflineAgents(path: string = '') {
  return `${path}last_checkin < now-${
    (offlineTimeoutIntervalCount * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s AND not (${buildKueryForErrorAgents(path)}) AND not ( ${buildKueryForUpdatingAgents(path)} )`;
}

export function buildKueryForUpgradingAgents(path: string = '') {
  return `(${path}upgrade_started_at:*) and not (${path}upgraded_at:*)`;
}

export function buildKueryForUpdatingAgents(path: string = '') {
  return `(${buildKueryForUpgradingAgents(path)}) or (${buildKueryForEnrollingAgents(
    path
  )}) or (${buildKueryForUnenrollingAgents(path)})`;
}

export function buildKueryForInactiveAgents(path: string = '') {
  return `${path}active:false`;
}
