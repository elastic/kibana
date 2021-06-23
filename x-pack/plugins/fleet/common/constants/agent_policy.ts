/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_POLICY_SAVED_OBJECT_TYPE = 'ingest-agent-policies';
export const AGENT_POLICY_INDEX = '.fleet-policies';
export const agentPolicyStatuses = {
  Active: 'active',
  Inactive: 'inactive',
} as const;
