/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetSetup, FleetStart } from '@kbn/fleet-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudDefendPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudDefendPluginStart {}

export interface CloudDefendPluginSetupDeps {
  fleet: FleetSetup;
}
export interface CloudDefendPluginStartDeps {
  fleet: FleetStart;
}
