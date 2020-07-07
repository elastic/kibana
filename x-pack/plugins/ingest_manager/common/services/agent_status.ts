/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AGENT_POLLING_THRESHOLD_MS,
  AGENT_TYPE_PERMANENT,
  AGENT_SAVED_OBJECT_TYPE,
} from '../constants';
import { Agent, AgentStatus } from '../types';

export function getAgentStatus(agent: Agent, now: number = Date.now()): AgentStatus {
  const { last_checkin: lastCheckIn } = agent;

  if (!agent.last_checkin) {
    return 'enrolling';
  }

  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();
  const msSinceLastCheckIn = new Date().getTime() - msLastCheckIn;
  const intervalsSinceLastCheckIn = Math.floor(msSinceLastCheckIn / AGENT_POLLING_THRESHOLD_MS);
  if (!agent.active) {
    return 'inactive';
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
  if (intervalsSinceLastCheckIn >= 4) {
    return 'offline';
  }

  return 'online';
}

export function buildKueryForOnlineAgents() {
  return `not( fleet-agents.last_checkin: * ) or (${AGENT_SAVED_OBJECT_TYPE}.last_checkin >= now-${
    (4 * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s)`;
}

export function buildKueryForOfflineAgents() {
  return `${AGENT_SAVED_OBJECT_TYPE}.type:${AGENT_TYPE_PERMANENT} AND ${AGENT_SAVED_OBJECT_TYPE}.last_checkin < now-${
    (4 * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s`;
}

export function buildKueryForErrorAgents() {
  // TODO fix
  return `${AGENT_SAVED_OBJECT_TYPE}.type:notexist AND ${AGENT_SAVED_OBJECT_TYPE}.last_checkin < now-${
    (10000 * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s`;
}
