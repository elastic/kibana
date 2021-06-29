/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataPluginSetup, DataPluginStart } from '../../../../src/plugins/data/server/plugin';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TimelinesPluginUI {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TimelinesPluginStart {}

export interface SetupPlugins {
  data: DataPluginSetup;
}

export interface StartPlugins {
  data: DataPluginStart;
}
