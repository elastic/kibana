/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomRequestHandlerContext } from '@kbn/core/server';
import { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';

export interface DatasetQualityPluginSetupDependencies {
  fleet: FleetSetupContract;
}

export interface DatasetQualityPluginStartDependencies {
  fleet: FleetStartContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginStart {}

export type DatasetQualityRequestHandlerContext = CustomRequestHandlerContext<{}>;
