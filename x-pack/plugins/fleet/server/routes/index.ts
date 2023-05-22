/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../services/security';

import type { FleetConfigType } from '../config';

import { registerRoutes as registerAgentPolicyRoutes } from './agent_policy';
import { registerRoutes as registerPackagePolicyRoutes } from './package_policy';
import { registerRoutes as registerDataStreamRoutes } from './data_streams';
import { registerRoutes as registerEPMRoutes } from './epm';
import { registerRoutes as registerSetupRoutes } from './setup';
import { registerAPIRoutes as registerAgentAPIRoutes } from './agent';
import { registerRoutes as registerEnrollmentApiKeyRoutes } from './enrollment_api_key';
import { registerRoutes as registerOutputRoutes } from './output';
import { registerRoutes as registerSettingsRoutes } from './settings';
import { registerRoutes as registerAppRoutes } from './app';
import { registerRoutes as registerPreconfigurationRoutes } from './preconfiguration';
import { registerRoutes as registerDownloadSourcesRoutes } from './download_source';
import { registerRoutes as registerHealthCheckRoutes } from './health_check';
import { registerRoutes as registerFleetServerHostRoutes } from './fleet_server_policy_config';
import { registerRoutes as registerFleetProxiesRoutes } from './fleet_proxies';
import { registerRoutes as registerMessageSigningServiceRoutes } from './message_signing_service';

export async function registerRoutes(fleetAuthzRouter: FleetAuthzRouter, config: FleetConfigType) {
  // Always register app routes for permissions checking
  registerAppRoutes(fleetAuthzRouter);

  // The upload package route is only authorized for the superuser
  registerEPMRoutes(fleetAuthzRouter);

  registerSetupRoutes(fleetAuthzRouter, config);
  registerAgentPolicyRoutes(fleetAuthzRouter);
  registerPackagePolicyRoutes(fleetAuthzRouter);
  registerOutputRoutes(fleetAuthzRouter);
  registerSettingsRoutes(fleetAuthzRouter);
  registerDataStreamRoutes(fleetAuthzRouter);
  registerPreconfigurationRoutes(fleetAuthzRouter);
  registerFleetServerHostRoutes(fleetAuthzRouter);
  registerFleetProxiesRoutes(fleetAuthzRouter);
  registerDownloadSourcesRoutes(fleetAuthzRouter);
  registerHealthCheckRoutes(fleetAuthzRouter);
  registerMessageSigningServiceRoutes(fleetAuthzRouter);

  // Conditional config routes
  if (config.agents.enabled) {
    registerAgentAPIRoutes(fleetAuthzRouter, config);
    registerEnrollmentApiKeyRoutes(fleetAuthzRouter);
  }
}
