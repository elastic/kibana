/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  GetRuleMigrationResourcesRequestParams,
  GetRuleMigrationResourcesRequestQuery,
  type GetRuleMigrationResourcesResponse,
} from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_RESOURCES_PATH } from '../../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { withLicense } from '../util/with_license';

export const registerSiemRuleMigrationsResourceGetRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATION_RESOURCES_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetRuleMigrationResourcesRequestParams),
            query: buildRouteValidationWithZod(GetRuleMigrationResourcesRequestQuery),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<GetRuleMigrationResourcesResponse>> => {
          const migrationId = req.params.migration_id;
          const { type, names } = req.query;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

            const resources = await ruleMigrationsClient.data.resources.get(
              migrationId,
              type,
              names
            );

            return res.ok({ body: resources });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
