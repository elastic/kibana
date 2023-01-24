/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';

export interface ProfilingPluginSetupDeps {
  observability: ObservabilityPluginSetup;
  features: FeaturesPluginSetup;
  spaces: SpacesPluginStart;
  cloud: CloudSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStartDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStart {}

export type ProfilingRequestHandlerContext = CustomRequestHandlerContext<{}>;
