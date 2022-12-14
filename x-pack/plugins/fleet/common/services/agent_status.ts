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

  if (agent.unenrolled_at) {
    return 'unenrolled';
  }

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

  if (agent.last_checkin_status?.toLowerCase() === 'error') {
    return 'error';
  }
  if (agent.last_checkin_status?.toLowerCase() === 'degraded') {
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

  if (agent.last_checkin_status?.toLowerCase() === 'error') {
    return 'error';
  }
  if (agent.last_checkin_status?.toLowerCase() === 'degraded') {
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

export function buildKueryForUnenrolledAgents(): string {
  return 'status:unenrolled';
}

export function buildKueryForOnlineAgents(): string {
  return 'status:online';
}

export function buildKueryForErrorAgents(): string {
  return '(status:error or status:degraded)';
}

export function buildKueryForOfflineAgents(): string {
  return 'status:offline';
}

export function buildKueryForUpdatingAgents(): string {
  return '(status:updating or status:unenrolling or status:enrolling)';
}

export function buildKueryForInactiveAgents() {
  return 'status:inactive';
}
