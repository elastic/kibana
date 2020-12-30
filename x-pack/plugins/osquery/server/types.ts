/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';
import { FleetStartContract } from '../../fleet/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginStart {}

export interface SetupPlugins {
  data: DataPluginSetup;
}

export interface StartPlugins {
  data: DataPluginStart;
  fleet?: FleetStartContract;
}
