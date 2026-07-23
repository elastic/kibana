/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';

export enum ApmFeatureFlagName {
  AgentConfigurationAvailable = 'agentConfigurationAvailable',
  ConfigurableIndicesAvailable = 'configurableIndicesAvailable',
  InfrastructureTabAvailable = 'infrastructureTabAvailable',
  InfraUiAvailable = 'infraUiAvailable',
  MigrationToFleetAvailable = 'migrationToFleetAvailable',
  SourcemapApiAvailable = 'sourcemapApiAvailable',
  StorageExplorerAvailable = 'storageExplorerAvailable',
  RuleFormV2Enabled = 'ruleFormV2Enabled',
}

const apmFeatureFlagMap = {
  [ApmFeatureFlagName.AgentConfigurationAvailable]: {
    default: true,
  },
  [ApmFeatureFlagName.ConfigurableIndicesAvailable]: {
    default: true,
  },
  [ApmFeatureFlagName.InfrastructureTabAvailable]: {
    default: true,
  },
  [ApmFeatureFlagName.InfraUiAvailable]: {
    default: true,
  },
  [ApmFeatureFlagName.MigrationToFleetAvailable]: {
    default: true,
  },
  [ApmFeatureFlagName.SourcemapApiAvailable]: {
    default: true,
  },
  [ApmFeatureFlagName.StorageExplorerAvailable]: {
    default: true,
  },
  [ApmFeatureFlagName.RuleFormV2Enabled]: {
    default: false,
  },
};

type ApmFeatureFlagMap = typeof apmFeatureFlagMap;

export type ApmFeatureFlags = {
  [TApmFeatureFlagName in keyof ApmFeatureFlagMap]: ValueOfApmFeatureFlag<TApmFeatureFlagName>;
};

export type ValueOfApmFeatureFlag<TApmFeatureFlagName extends ApmFeatureFlagName> =
  ApmFeatureFlagMap[TApmFeatureFlagName]['default'];

export function getApmFeatureFlags(): ApmFeatureFlags {
  return mapValues(apmFeatureFlagMap, (value, key) => value.default);
}
