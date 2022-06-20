/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { initPromisePool } from '../../../../../utils/promise_pool';
import { buildSiemResponse } from '../../utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { DETECTION_ENGINE_INSTALLED_INTEGRATIONS_URL } from '../../../../../../common/constants';
import { GetInstalledIntegrationsResponse } from '../../../../../../common/detection_engine/schemas/response/get_installed_integrations_response_schema';
import { createInstalledIntegrationSet } from './installed_integration_set';

const MAX_CONCURRENT_REQUESTS_TO_PACKAGE_REGISTRY = 5;

/**
 * Returns an array of installed Fleet integrations and their packages.
 */
export const getInstalledIntegrationsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
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
        const set = createInstalledIntegrationSet();

        const packagePolicies = await fleet.packagePolicy.list(fleet.internalReadonlySoClient, {});

        packagePolicies.items.forEach((policy) => {
          set.addPackagePolicy(policy);
        });

        const registryPackages = await initPromisePool({
          concurrency: MAX_CONCURRENT_REQUESTS_TO_PACKAGE_REGISTRY,
          items: set.getPackages(),
          executor: async (packageInfo) => {
            const registryPackage = await fleet.packages.getRegistryPackage(
              packageInfo.package_name,
              packageInfo.package_version
            );
            return registryPackage;
          },
        });

        registryPackages.errors.forEach(({ error, item }) => {
          const logMessage = `Error fetching package info from registry for ${item.package_name}@${item.package_version}`;
          const logReason = error instanceof Error ? error.message : String(error);
          logger.error(`${logMessage}. ${logReason}`);
        });

        registryPackages.results.forEach(({ result }) => {
          set.addRegistryPackage(result.packageInfo);
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
