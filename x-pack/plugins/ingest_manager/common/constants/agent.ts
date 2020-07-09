/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const AGENT_SAVED_OBJECT_TYPE = 'fleet-agents';
export const AGENT_EVENT_SAVED_OBJECT_TYPE = 'fleet-agent-events';
export const AGENT_ACTION_SAVED_OBJECT_TYPE = 'fleet-agent-actions';

export const AGENT_TYPE_PERMANENT = 'PERMANENT';
export const AGENT_TYPE_EPHEMERAL = 'EPHEMERAL';
export const AGENT_TYPE_TEMPORARY = 'TEMPORARY';

export const AGENT_POLLING_THRESHOLD_MS = 30000;
export const AGENT_POLLING_INTERVAL = 1000;
export const AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS = 30000;
export const AGENT_UPDATE_ACTIONS_INTERVAL_MS = 5000;

export const AGENT_CONFIG_ROLLUP_RATE_LIMIT_INTERVAL_MS = 5000;
export const AGENT_CONFIG_ROLLUP_RATE_LIMIT_REQUEST_PER_INTERVAL = 60;
