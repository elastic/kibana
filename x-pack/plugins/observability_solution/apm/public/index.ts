/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import {
  ApmPlugin,
  ApmPluginSetup,
  ApmPluginSetupDeps,
  ApmPluginStart,
  ApmPluginStartDeps,
} from './plugin';

export { createInvestigateServiceInventoryWidget } from './investigate/investigate_service_inventory/create_investigate_service_inventory_widget';

export interface ConfigSchema {
  serviceMapEnabled: boolean;
  ui: {
    enabled: boolean;
  };
  latestAgentVersionsUrl: string;
  serverlessOnboarding: boolean;
  managedServiceUrl: string;
  featureFlags: {
    agentConfigurationAvailable: boolean;
    configurableIndicesAvailable: boolean;
    infrastructureTabAvailable: boolean;
    infraUiAvailable: boolean;
    migrationToFleetAvailable: boolean;
    sourcemapApiAvailable: boolean;
    storageExplorerAvailable: boolean;
    profilingIntegrationAvailable: boolean;
    ruleFormV2Enabled: boolean;
  };
  serverless: {
    enabled: boolean;
  };
}

export const plugin: PluginInitializer<
  ApmPluginSetup,
  ApmPluginStart,
  ApmPluginSetupDeps,
  ApmPluginStartDeps
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ApmPlugin(pluginInitializerContext);

export type { ApmPluginSetup, ApmPluginStart };
