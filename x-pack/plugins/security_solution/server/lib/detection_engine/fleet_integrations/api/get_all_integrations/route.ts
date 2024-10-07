/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import { buildSiemResponse } from '../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { GetAllIntegrationsResponse } from '../../../../../../common/api/detection_engine/fleet_integrations';
import { GET_ALL_INTEGRATIONS_URL } from '../../../../../../common/api/detection_engine/fleet_integrations';
import { extractIntegrations } from './extract_integrations';
import { sortPackagesBySecurityCategory } from './sort_packages_by_security_category';
import { sortIntegrationsByStatus } from './sort_integrations_by_status';

/**
 * Returns an array of Fleet integrations and their packages
 */
export const getAllIntegrationsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_ALL_INTEGRATIONS_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, _, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'securitySolution']);
          const fleet = ctx.securitySolution.getInternalFleetServices();

          const [packages, packagePolicies] = await Promise.all([
            fleet.packages.getPackages(),
            fleet.packagePolicy.list(fleet.savedObjects.createInternalScopedSoClient(), {}),
          ]);
          // Elastic prebuilt rules is a special package and should be skipped
          const packagesWithoutPrebuiltSecurityRules = packages.filter(
            (x) => x.name !== PREBUILT_RULES_PACKAGE_NAME
          );

          sortPackagesBySecurityCategory(packagesWithoutPrebuiltSecurityRules);

          const integrations = extractIntegrations(
            packagesWithoutPrebuiltSecurityRules,
            packagePolicies.items
          );

          sortIntegrationsByStatus(integrations);

          const body: GetAllIntegrationsResponse = {
            integrations,
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
