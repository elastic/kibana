/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetUnauthorizedError } from '@kbn/fleet-plugin/server/errors';
import { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';

export async function getFleetPackageInfo(resources: APMRouteHandlerResources) {
  const fleetPluginStart = await resources.plugins.fleet?.start();

  try {
    const packageInfo = await fleetPluginStart?.packageService
      .asScoped(resources.request)
      .getInstallation('apm');

    return {
      isInstalled: packageInfo?.install_status === 'installed',
      version: packageInfo?.version,
    };
  } catch (e) {
    if (e instanceof FleetUnauthorizedError) {
      console.error('Insufficient permissions to access fleet package info');
      return {
        isInstalled: false,
        version: 'N/A',
      };
    }
    throw e;
  }
}
