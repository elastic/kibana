/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { DETECTION_ENGINE_INSTALLED_INTEGRATIONS_URL } from '../../../../../../common/constants';
import { GetInstalledIntegrationsResponse } from '../../../../../../common/detection_engine/schemas/response/get_installed_integrations_response_schema';
import { buildSiemResponse } from '../../utils';
import { createInstalledIntegrationSet } from './installed_integration_set';

/**
 * Returns an array of installed Fleet integrations and their packages.
 */
export const getInstalledIntegrationsRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_INSTALLED_INTEGRATIONS_URL,
      validate: {},
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const ctx = await context.resolve(['core', 'securitySolution']);
        const fleet = ctx.securitySolution.getInternalFleetServices();
        const soClient = ctx.core.savedObjects.client;
        const set = createInstalledIntegrationSet();

        const packagePolicies = await fleet.packagePolicy.list(soClient, {});

        packagePolicies.items.forEach((policy) => {
          set.addPackagePolicy(policy);
        });

        const registryPackages = await Promise.all(
          set.getPackages().map((packageInfo) => {
            return fleet.packages.getRegistryPackage(
              packageInfo.package_name,
              packageInfo.package_version
            );
          })
        );

        registryPackages.forEach((registryPackage) => {
          set.addRegistryPackage(registryPackage.packageInfo);
        });

        const installedIntegrations = set.getIntegrations();

        const body: GetInstalledIntegrationsResponse = {
          installed_integrations: installedIntegrations,
        };

        return response.ok({ body });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
