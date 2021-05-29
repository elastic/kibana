/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreconfiguredAgentPolicy } from '../types';

import { defaultPackages } from './epm';

export const PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE =
  'fleet-preconfiguration-deletion-record';

export const PRECONFIGURATION_LATEST_KEYWORD = 'latest';

type PreconfiguredAgentPolicyWithDefaultInputs = Omit<
  PreconfiguredAgentPolicy,
  'package_policies' | 'id'
> & {
  package_policies: Array<Omit<PreconfiguredAgentPolicy['package_policies'][0], 'inputs'>>;
};

export const DEFAULT_AGENT_POLICY: PreconfiguredAgentPolicyWithDefaultInputs = {
  name: 'Default policy',
  namespace: 'default',
  description: 'Default agent policy created by Kibana',
  package_policies: [
    {
      name: `${defaultPackages.System}-1`,
      package: {
        name: defaultPackages.System,
      },
    },
  ],
  is_default: true,
  is_managed: false,
  monitoring_enabled: ['logs', 'metrics'] as Array<'logs' | 'metrics'>,
};

export const DEFAULT_FLEET_SERVER_AGENT_POLICY: PreconfiguredAgentPolicyWithDefaultInputs = {
  name: 'Default Fleet Server policy',
  namespace: 'default',
  description: 'Default Fleet Server agent policy created by Kibana',
  package_policies: [
    {
      name: `${defaultPackages.FleetServer}-1`,
      package: {
        name: defaultPackages.FleetServer,
      },
    },
  ],
  is_default: false,
  is_default_fleet_server: true,
  is_managed: false,
  monitoring_enabled: ['logs', 'metrics'] as Array<'logs' | 'metrics'>,
};

export const DEFAULT_PACKAGES = Object.values(defaultPackages).map((name) => ({
  name,
  version: PRECONFIGURATION_LATEST_KEYWORD,
}));

// these are currently identical. we can separate if they later diverge
export const REQUIRED_PACKAGES = DEFAULT_PACKAGES;

export interface PreconfigurationError {
  package?: { name: string; version: string };
  agentPolicy?: { name: string };
  error: Error;
}
