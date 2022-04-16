/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { AgentPolicy, PackagePolicy, Settings } from '../../types';

export const migrateAgentPolicyToV7100: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'package_policies'> & {
    package_configs: string[] | PackagePolicy[];
  },
  AgentPolicy
> = (agentPolicyDoc) => {
  agentPolicyDoc.attributes.package_policies = agentPolicyDoc.attributes.package_configs;
  // @ts-expect-error
  delete agentPolicyDoc.attributes.package_configs;

  return agentPolicyDoc;
};

export const migratePackagePolicyToV7100: SavedObjectMigrationFn<
  Exclude<PackagePolicy, 'policy_id'> & {
    config_id: string;
  },
  PackagePolicy
> = (packagePolicyDoc) => {
  packagePolicyDoc.attributes.policy_id = packagePolicyDoc.attributes.config_id;
  // @ts-expect-error
  delete packagePolicyDoc.attributes.config_id;

  return packagePolicyDoc;
};

export const migrateSettingsToV7100: SavedObjectMigrationFn<
  Exclude<Settings, 'kibana_urls'> & {
    kibana_url: string;
  },
  Settings
> = (settingsDoc) => {
  // @ts-expect-error
  settingsDoc.attributes.kibana_urls = [settingsDoc.attributes.kibana_url];
  // @ts-expect-error
  delete settingsDoc.attributes.kibana_url;

  return settingsDoc;
};
