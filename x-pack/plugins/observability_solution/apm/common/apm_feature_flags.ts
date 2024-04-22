/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { mapValues } from 'lodash';

export enum ApmFeatureFlagName {
  AgentConfigurationAvailable = 'agentConfigurationAvailable',
  ConfigurableIndicesAvailable = 'configurableIndicesAvailable',
  InfrastructureTabAvailable = 'infrastructureTabAvailable',
  InfraUiAvailable = 'infraUiAvailable',
  MigrationToFleetAvailable = 'migrationToFleetAvailable',
  SourcemapApiAvailable = 'sourcemapApiAvailable',
  StorageExplorerAvailable = 'storageExplorerAvailable',
  ProfilingIntegrationAvailable = 'profilingIntegrationAvailable',
  RuleFormV2Enabled = 'ruleFormV2Enabled',
}

const apmFeatureFlagMap = {
  [ApmFeatureFlagName.AgentConfigurationAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmFeatureFlagName.ConfigurableIndicesAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmFeatureFlagName.InfrastructureTabAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmFeatureFlagName.InfraUiAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmFeatureFlagName.MigrationToFleetAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmFeatureFlagName.SourcemapApiAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmFeatureFlagName.StorageExplorerAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmFeatureFlagName.ProfilingIntegrationAvailable]: {
    default: false,
    type: t.boolean,
  },
  [ApmFeatureFlagName.RuleFormV2Enabled]: {
    default: false,
    type: t.boolean,
  },
};

type ApmFeatureFlagMap = typeof apmFeatureFlagMap;

export type ApmFeatureFlags = {
  [TApmFeatureFlagName in keyof ApmFeatureFlagMap]: ValueOfApmFeatureFlag<TApmFeatureFlagName>;
};

export type ValueOfApmFeatureFlag<
  TApmFeatureFlagName extends ApmFeatureFlagName
> = t.OutputOf<ApmFeatureFlagMap[TApmFeatureFlagName]['type']>;

export function getApmFeatureFlags(): ApmFeatureFlags {
  return mapValues(apmFeatureFlagMap, (value, key) => value.default);
}
