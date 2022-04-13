/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENTS_PREFIX = 'fleet-agents';

export const AGENT_TYPE_PERMANENT = 'PERMANENT';
export const AGENT_TYPE_EPHEMERAL = 'EPHEMERAL';
export const AGENT_TYPE_TEMPORARY = 'TEMPORARY';

export const AGENT_POLLING_REQUEST_TIMEOUT_MS = 300000; // 5 minutes
export const AGENT_POLLING_REQUEST_TIMEOUT_MARGIN_MS = 20000; // 20s

export const AGENT_POLLING_THRESHOLD_MS = 30000;
export const AGENT_POLLING_INTERVAL = 1000;
export const AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS = 30000;
export const AGENT_UPDATE_ACTIONS_INTERVAL_MS = 5000;

export const AGENT_POLICY_ROLLOUT_RATE_LIMIT_INTERVAL_MS = 1000;
export const AGENT_POLICY_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL = 5;

export const AGENTS_INDEX = '.fleet-agents';
export const AGENT_ACTIONS_INDEX = '.fleet-actions';
export const AGENT_ACTIONS_RESULTS_INDEX = '.fleet-actions-results';
