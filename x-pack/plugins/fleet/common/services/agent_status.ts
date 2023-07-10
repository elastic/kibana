/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, AgentStatus, FleetServerAgent } from '../types';
import { AGENTS_PREFIX } from '../constants';

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
  return `${AGENTS_PREFIX}.status:unenrolled`;
}

export function buildKueryForOnlineAgents(): string {
  return `${AGENTS_PREFIX}.status:online`;
}

export function buildKueryForErrorAgents(): string {
  return `(${AGENTS_PREFIX}.status:error or ${AGENTS_PREFIX}.status:degraded)`;
}

export function buildKueryForOfflineAgents(): string {
  return `${AGENTS_PREFIX}.status:offline`;
}

export function buildKueryForUpdatingAgents(): string {
  return `(${AGENTS_PREFIX}.status:updating or ${AGENTS_PREFIX}.status:unenrolling or ${AGENTS_PREFIX}.status:enrolling)`;
}

export function buildKueryForInactiveAgents() {
  return `${AGENTS_PREFIX}.status:inactive`;
}
