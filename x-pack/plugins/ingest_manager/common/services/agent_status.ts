/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AGENT_TYPE_TEMPORARY,
  AGENT_POLLING_THRESHOLD_MS,
  AGENT_TYPE_PERMANENT,
} from '../constants';

export function buildKueryForOnlineAgents() {
  return `agents.last_checkin >= now-${(3 * AGENT_POLLING_THRESHOLD_MS) / 1000}s`;
}

export function buildKueryForOfflineAgents() {
  return `agents.type:${AGENT_TYPE_TEMPORARY} AND agents.last_checkin < now-${(3 *
    AGENT_POLLING_THRESHOLD_MS) /
    1000}s`;
}

export function buildKueryForErrorAgents() {
  return `agents.type:${AGENT_TYPE_PERMANENT} AND agents.last_checkin < now-${(4 *
    AGENT_POLLING_THRESHOLD_MS) /
    1000}s`;
}
