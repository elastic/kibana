/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import { SpacesPluginStart, SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';

export interface ProfilingPluginSetupDeps {
  observability: ObservabilityPluginSetup;
  features: FeaturesPluginSetup;
  spaces: SpacesPluginSetup;
  cloud: CloudSetup;
  fleet: FleetSetupContract;
}

export interface ProfilingPluginStartDeps {
  observability: {};
  features: {};
  spaces: SpacesPluginStart;
  cloud: CloudStart;
  fleet: FleetStartContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStart {}

export type ProfilingRequestHandlerContext = CustomRequestHandlerContext<{}>;
