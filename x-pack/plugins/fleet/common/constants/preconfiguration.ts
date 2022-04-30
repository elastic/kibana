/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import uuidv5 from 'uuid/v5';

import type { PreconfiguredAgentPolicy } from '../types';

import {
  defaultPackages,
  FLEET_SYSTEM_PACKAGE,
  FLEET_SERVER_PACKAGE,
  autoUpdatePackages,
  monitoringTypes,
  autoUpgradePoliciesPackages,
} from './epm';

// UUID v5 values require a namespace. We use UUID v5 for some of our preconfigured ID values.
export const UUID_V5_NAMESPACE = 'dde7c2de-1370-4c19-9975-b473d0e03508';

export const PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE =
  'fleet-preconfiguration-deletion-record';

export const PRECONFIGURATION_LATEST_KEYWORD = 'latest';

type PreconfiguredAgentPolicyWithDefaultInputs = Omit<
  PreconfiguredAgentPolicy,
  'package_policies'
> & {
  package_policies: Array<Omit<PreconfiguredAgentPolicy['package_policies'][0], 'inputs'>>;
};

export const DEFAULT_AGENT_POLICY_ID_SEED = 'default-agent-policy';
export const DEFAULT_SYSTEM_PACKAGE_POLICY_ID = 'default-system-policy';

export const DEFAULT_AGENT_POLICY: PreconfiguredAgentPolicyWithDefaultInputs = {
  id: uuidv5(DEFAULT_AGENT_POLICY_ID_SEED, UUID_V5_NAMESPACE),
  name: 'Default policy',
  namespace: 'default',
  description: 'Default agent policy created by Kibana',
  package_policies: [
    {
      id: DEFAULT_SYSTEM_PACKAGE_POLICY_ID,
      name: `${FLEET_SYSTEM_PACKAGE}-1`,
      package: {
        name: FLEET_SYSTEM_PACKAGE,
      },
    },
  ],
  is_default: true,
  is_managed: false,
  monitoring_enabled: monitoringTypes,
};

export const DEFAULT_FLEET_SERVER_POLICY_ID = 'default-fleet-server-agent-policy';
export const DEFAULT_FLEET_SERVER_AGENT_POLICY_ID_SEED = 'default-fleet-server';

export const DEFAULT_FLEET_SERVER_AGENT_POLICY: PreconfiguredAgentPolicyWithDefaultInputs = {
  id: uuidv5(DEFAULT_FLEET_SERVER_AGENT_POLICY_ID_SEED, UUID_V5_NAMESPACE),
  name: 'Default Fleet Server policy',
  namespace: 'default',
  description: 'Default Fleet Server agent policy created by Kibana',
  package_policies: [
    {
      id: DEFAULT_FLEET_SERVER_POLICY_ID,
      name: `${FLEET_SERVER_PACKAGE}-1`,
      package: {
        name: FLEET_SERVER_PACKAGE,
      },
    },
  ],
  is_default: false,
  is_default_fleet_server: true,
  is_managed: false,
  monitoring_enabled: monitoringTypes,
};

export const DEFAULT_PACKAGES = defaultPackages.map((name) => ({
  name,
  version: PRECONFIGURATION_LATEST_KEYWORD,
}));

export const AUTO_UPDATE_PACKAGES = autoUpdatePackages.map((name) => ({
  name,
  version: PRECONFIGURATION_LATEST_KEYWORD,
}));

// These packages default to `keep_policies_up_to_date: true` and don't allow users to opt out
export const AUTO_UPGRADE_POLICIES_PACKAGES = autoUpgradePoliciesPackages.map((name) => ({
  name,
  version: PRECONFIGURATION_LATEST_KEYWORD,
}));

// Controls whether the `Keep Policies up to date` setting is exposed to the user
export const KEEP_POLICIES_UP_TO_DATE_PACKAGES = uniqBy(
  [...AUTO_UPGRADE_POLICIES_PACKAGES, ...DEFAULT_PACKAGES, ...AUTO_UPDATE_PACKAGES],
  ({ name }) => name
);

export interface PreconfigurationError {
  package?: { name: string; version: string };
  agentPolicy?: { name: string };
  error: Error;
}
