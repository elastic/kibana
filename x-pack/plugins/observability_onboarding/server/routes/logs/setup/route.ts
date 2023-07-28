/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityOnboardingServerRoute } from '../../create_observability_onboarding_server_route';
import { getFallbackKibanaUrl } from '../../../lib/get_fallback_urls';
import { hasLogMonitoringPrivileges } from './has_log_monitoring_privileges';

const logMonitoringPrivilegesRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/logs/setup/privileges',
  options: { tags: [] },

  handler: async (resources): Promise<{ hasPrivileges: boolean }> => {
    const { context } = resources;

    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(
      client.asCurrentUser
    );

    return { hasPrivileges };
  },
});

const installShipperSetupRoute = createObservabilityOnboardingServerRoute({
  endpoint:
    'GET /internal/observability_onboarding/logs/setup/install_shipper_setup',
  options: { tags: [] },
  async handler(resources): Promise<{
    apiEndpoint: string;
    scriptDownloadUrl: string;
    elasticAgentVersion: string;
  }> {
    const { core, plugins, kibanaVersion } = resources;
    const coreStart = await core.start();

    const kibanaUrl =
      core.setup.http.basePath.publicBaseUrl ?? // priority given to server.publicBaseUrl
      plugins.cloud?.setup?.kibanaUrl ?? // then cloud id
      getFallbackKibanaUrl(coreStart); // falls back to local network binding
    const scriptDownloadUrl = `${kibanaUrl}/plugins/observabilityOnboarding/assets/standalone_agent_setup.sh`;
    const apiEndpoint = `${kibanaUrl}/internal/observability_onboarding`;

    return {
      apiEndpoint,
      scriptDownloadUrl,
      elasticAgentVersion: kibanaVersion,
    };
  },
});

export const logsSetupRouteRepository = {
  ...logMonitoringPrivilegesRoute,
  ...installShipperSetupRoute,
};
