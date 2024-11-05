/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { StopRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rules_migration.gen';
import { StopRuleMigrationRequestParams } from '../../../../../common/siem_migrations/model/api/rules/rules_migration.gen';
import { SIEM_RULE_MIGRATIONS_STOP_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

export const registerSiemRuleMigrationsStopRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      path: SIEM_RULE_MIGRATIONS_STOP_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(StopRuleMigrationRequestParams) },
        },
      },
      async (context, req, res): Promise<IKibanaResponse<StopRuleMigrationResponse>> => {
        const migrationId = req.params.migration_id;
        try {
          const ctx = await context.resolve(['securitySolution']);
          const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

          const { exists, stopped } = await ruleMigrationsClient.task.stop(migrationId);

          if (!exists) {
            return res.noContent();
          }
          return res.ok({ body: { stopped } });
        } catch (err) {
          logger.error(err);
          return res.badRequest({ body: err.message });
        }
      }
    );
};
