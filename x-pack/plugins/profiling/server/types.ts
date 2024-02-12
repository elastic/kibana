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
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  ProfilingDataAccessPluginSetup,
  ProfilingDataAccessPluginStart,
} from '@kbn/profiling-data-access-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';

export interface ProfilingPluginSetupDeps {
  observability: ObservabilityPluginSetup;
  features: FeaturesPluginSetup;
  cloud?: CloudSetup;
  fleet?: FleetSetupContract;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  profilingDataAccess: ProfilingDataAccessPluginSetup;
  security?: SecurityPluginSetup;
}

export interface ProfilingPluginStartDeps {
  observability: {};
  features: {};
  cloud?: CloudStart;
  fleet?: FleetStartContract;
  spaces?: SpacesPluginStart;
  profilingDataAccess: ProfilingDataAccessPluginStart;
  security?: SecurityPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStart {}

export type ProfilingRequestHandlerContext = CustomRequestHandlerContext<{}>;

export type TelemetryUsageCounter = ReturnType<UsageCollectionSetup['createUsageCounter']>;
