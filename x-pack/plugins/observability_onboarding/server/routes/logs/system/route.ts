/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityOnboardingServerRoute } from '../../create_observability_onboarding_server_route';

const systemIntegrationInstallRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/logs/system/integration',
  options: { tags: [] },

  handler: async (
    resources
  ): Promise<{ name?: string; version?: string; status: string }> => {
    const {
      plugins: { fleet },
      request,
    } = resources;

    const fleetPluginStart = await fleet.start();
    const packageClient = fleetPluginStart.packageService.asScoped(request);

    const systemIntegration = await packageClient.getInstallation('system');

    if (systemIntegration) {
      return {
        name: systemIntegration.name,
        version: systemIntegration.install_version,
        status: systemIntegration.install_status,
      };
    }

    const installedIntegration = await packageClient.ensureInstalledPackage({
      pkgName: 'system',
    });

    if (installedIntegration) {
      return {
        name: installedIntegration.name,
        version: installedIntegration.install_version,
        status: installedIntegration.install_status,
      };
    }

    return {
      status: 'not_installed',
    };
  },
});

export const systemLogsOnboardingRouteRepository = {
  ...systemIntegrationInstallRoute,
};
