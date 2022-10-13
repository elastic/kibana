/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLLING_THRESHOLD_MS } from '../constants';
import type { Agent, AgentStatus, FleetServerAgent } from '../types';

const offlineTimeoutIntervalCount = 10; // 30s*10 = 5m timeout

export function getAgentStatus(agent: Agent | FleetServerAgent): AgentStatus {
  const { last_checkin: lastCheckIn } = agent;

  if (!agent.active) {
    return 'inactive';
  }

  if (!agent.last_checkin) {
    return 'enrolling';
  }

  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();
  const msSinceLastCheckIn = new Date().getTime() - msLastCheckIn;
  const intervalsSinceLastCheckIn = Math.floor(msSinceLastCheckIn / AGENT_POLLING_THRESHOLD_MS);

  if (intervalsSinceLastCheckIn >= offlineTimeoutIntervalCount) {
    return 'offline';
  }

  if (agent.unenrollment_started_at && !agent.unenrolled_at) {
    return 'unenrolling';
  }

  if (agent.last_checkin_status === 'error') {
    return 'error';
  }
  if (agent.last_checkin_status === 'degraded') {
    return 'degraded';
  }

  const policyRevision =
    'policy_revision' in agent
      ? agent.policy_revision
      : 'policy_revision_idx' in agent
      ? agent.policy_revision_idx
      : undefined;

  if (!policyRevision || (agent.upgrade_started_at && !agent.upgraded_at)) {
    return 'updating';
  }

  return 'online';
}

export function getPreviousAgentStatusForOfflineAgents(
  agent: Agent | FleetServerAgent
): AgentStatus | undefined {
  if (agent.unenrollment_started_at && !agent.unenrolled_at) {
    return 'unenrolling';
  }

  if (agent.last_checkin_status === 'error') {
    return 'error';
  }
  if (agent.last_checkin_status === 'degraded') {
    return 'degraded';
  }

  const policyRevision =
    'policy_revision' in agent
      ? agent.policy_revision
      : 'policy_revision_idx' in agent
      ? agent.policy_revision_idx
      : undefined;

  if (!policyRevision || (agent.upgrade_started_at && !agent.upgraded_at)) {
    return 'updating';
  }
}

export function buildKueryForEnrollingAgents(path: string = ''): string {
  return `not (${path}last_checkin:*)`;
}

export function buildKueryForUnenrollingAgents(path: string = ''): string {
  return `${path}unenrollment_started_at:*`;
}

export function buildKueryForOnlineAgents(path: string = ''): string {
  return `${path}last_checkin:* ${addExclusiveKueryFilter(
    [buildKueryForOfflineAgents, buildKueryForUpdatingAgents, buildKueryForErrorAgents],
    path
  )}`;
}

export function buildKueryForErrorAgents(path: string = ''): string {
  return `(${path}last_checkin_status:error or ${path}last_checkin_status:degraded) ${addExclusiveKueryFilter(
    [buildKueryForOfflineAgents, buildKueryForUnenrollingAgents],
    path
  )}`;
}

export function buildKueryForOfflineAgents(path: string = ''): string {
  return `${path}last_checkin < now-${
    (offlineTimeoutIntervalCount * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s`;
}

export function buildKueryForUpgradingAgents(path: string = ''): string {
  return `(${path}upgrade_started_at:*) and not (${path}upgraded_at:*)`;
}

export function buildKueryForUpdatingAgents(path: string = ''): string {
  return `((${buildKueryForUpgradingAgents(path)}) or (${buildKueryForEnrollingAgents(
    path
  )}) or (${buildKueryForUnenrollingAgents(
    path
  )}) or (not ${path}policy_revision_idx:*)) ${addExclusiveKueryFilter(
    [buildKueryForOfflineAgents, buildKueryForErrorAgents],
    path
  )}`;
}

export function buildKueryForInactiveAgents(path: string = '') {
  return `${path}active:false`;
}

function addExclusiveKueryFilter(kueryBuilders: Array<(path?: string) => string>, path?: string) {
  return ` AND not (${kueryBuilders
    .map((kueryBuilder) => `(${kueryBuilder(path)})`)
    .join(' or ')})`;
}
