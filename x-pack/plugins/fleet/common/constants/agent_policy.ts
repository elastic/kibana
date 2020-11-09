/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { defaultPackages } from './epm';
import { AgentPolicy } from '../types';
export const AGENT_POLICY_SAVED_OBJECT_TYPE = 'ingest-agent-policies';

export const agentPolicyStatuses = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export const DEFAULT_AGENT_POLICY: Omit<
  AgentPolicy,
  'id' | 'updated_at' | 'updated_by' | 'revision'
> = {
  name: 'Default policy',
  namespace: 'default',
  description: 'Default agent policy created by Kibana',
  status: agentPolicyStatuses.Active,
  package_policies: [],
  is_default: true,
  monitoring_enabled: ['logs', 'metrics'] as Array<'logs' | 'metrics'>,
};

export const DEFAULT_AGENT_POLICIES_PACKAGES = [defaultPackages.System];
