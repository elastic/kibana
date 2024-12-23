/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, AgentStatus, FleetServerAgent } from '../types';

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

export const AGENT_UPDATING_TIMEOUT_HOURS = 2;

export function isStuckInUpdating(agent: Agent): boolean {
  const hasTimedOut = (upgradeStartedAt: string) =>
    Date.now() - Date.parse(upgradeStartedAt) > AGENT_UPDATING_TIMEOUT_HOURS * 60 * 60 * 1000;
  return (
    (agent.status !== 'offline' && agent.active && isAgentInFailedUpgradeState(agent)) ||
    (agent.status === 'updating' &&
      !!agent.upgrade_started_at &&
      !agent.upgraded_at &&
      hasTimedOut(agent.upgrade_started_at) &&
      !agent.upgrade_details?.state)
  );
}

export function isAgentInFailedUpgradeState(agent: Agent): boolean {
  return agent.upgrade_details?.state === 'UPG_FAILED';
}
