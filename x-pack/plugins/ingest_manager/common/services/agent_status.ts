/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AGENT_TYPE_TEMPORARY,
  AGENT_POLLING_THRESHOLD_MS,
  AGENT_TYPE_PERMANENT,
  AGENT_TYPE_EPHEMERAL,
  AGENT_SAVED_OBJECT_TYPE,
} from '../constants';
import { Agent, AgentStatus } from '../types';

export function getAgentStatus(agent: Agent, now: number = Date.now()): AgentStatus {
  const { type, last_checkin: lastCheckIn } = agent;
  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();
  const msSinceLastCheckIn = new Date().getTime() - msLastCheckIn;
  const intervalsSinceLastCheckIn = Math.floor(msSinceLastCheckIn / AGENT_POLLING_THRESHOLD_MS);
  if (!agent.active) {
    return 'inactive';
  }
  if (agent.current_error_events.length > 0) {
    return 'error';
  }
  switch (type) {
    case AGENT_TYPE_PERMANENT:
      if (intervalsSinceLastCheckIn >= 4) {
        return 'error';
      }
    case AGENT_TYPE_TEMPORARY:
      if (intervalsSinceLastCheckIn >= 3) {
        return 'offline';
      }
    case AGENT_TYPE_EPHEMERAL:
      if (intervalsSinceLastCheckIn >= 3) {
        return 'inactive';
      }
  }
  return 'online';
}

export function buildKueryForOnlineAgents() {
  return `(${AGENT_SAVED_OBJECT_TYPE}.type:${AGENT_TYPE_PERMANENT} and ${AGENT_SAVED_OBJECT_TYPE}.last_checkin >= now-${
    (4 * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s) or (${AGENT_SAVED_OBJECT_TYPE}.type:${AGENT_TYPE_TEMPORARY} and ${AGENT_SAVED_OBJECT_TYPE}.last_checkin >= now-${
    (3 * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s) or (${AGENT_SAVED_OBJECT_TYPE}.type:${AGENT_TYPE_EPHEMERAL} and ${AGENT_SAVED_OBJECT_TYPE}.last_checkin >= now-${
    (3 * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s)`;
}

export function buildKueryForOfflineAgents() {
  return `${AGENT_SAVED_OBJECT_TYPE}.type:${AGENT_TYPE_TEMPORARY} AND ${AGENT_SAVED_OBJECT_TYPE}.last_checkin < now-${
    (3 * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s`;
}

export function buildKueryForErrorAgents() {
  return `${AGENT_SAVED_OBJECT_TYPE}.type:${AGENT_TYPE_PERMANENT} AND ${AGENT_SAVED_OBJECT_TYPE}.last_checkin < now-${
    (4 * AGENT_POLLING_THRESHOLD_MS) / 1000
  }s`;
}
