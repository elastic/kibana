/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsPlugin } from '../../actions/server';
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
  actions: ActionsPlugin['setup'];
  data: DataPluginSetup;
}

export interface StartPlugins {
  actions: ActionsPlugin['start'];
  data: DataPluginStart;
  fleet?: FleetStartContract;
}
