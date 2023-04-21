/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { mapValues } from 'lodash';

export enum ApmSettingName {
  AgentConfigurationAvailable = 'agentConfigurationAvailable',
  ConfigurableIndicesAvailable = 'configurableIndicesAvailable',
  InfrastructureTabAvailable = 'infrastructureTabAvailable',
  InfraUiAvailable = 'infraUiAvailable',
  MigrationToFleetAvailable = 'migrationToFleetAvailable',
  SourcemapUploadAvailable = 'sourcemapUploadAvailable',
  SpacesAvailable = 'spacesAvailable',
}

const apmSettingsMap = {
  [ApmSettingName.AgentConfigurationAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmSettingName.ConfigurableIndicesAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmSettingName.InfrastructureTabAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmSettingName.InfraUiAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmSettingName.MigrationToFleetAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmSettingName.SourcemapUploadAvailable]: {
    default: true,
    type: t.boolean,
  },
  [ApmSettingName.SpacesAvailable]: {
    default: true,
    type: t.boolean,
  },
};

type ApmSettingsMap = typeof apmSettingsMap;

export type ApmSettings = {
  [TApmSettingName in keyof ApmSettingsMap]: ValueOfApmSetting<TApmSettingName>;
};

export type ValueOfApmSetting<TApmSettingName extends ApmSettingName> =
  t.OutputOf<ApmSettingsMap[TApmSettingName]['type']>;

export function getApmSettings(): ApmSettings {
  return mapValues(apmSettingsMap, (value, key) => value.default);
}
