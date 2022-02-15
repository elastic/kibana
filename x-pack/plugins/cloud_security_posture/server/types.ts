/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';

import type { FleetStartContract } from '../../fleet/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspServerPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspServerPluginStart {}

export interface CspServerPluginSetupDeps {
  // required
  data: DataPluginSetup;

  // optional
}

export interface CspServerPluginStartDeps {
  // required
  data: DataPluginStart;
  fleet: FleetStartContract;
}
