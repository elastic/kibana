/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { CancelRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rules_migration.gen';
import { CancelRuleMigrationRequestParams } from '../../../../../common/siem_migrations/model/api/rules/rules_migration.gen';
import { SIEM_RULE_MIGRATIONS_CANCEL_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

export const registerSiemRuleMigrationsCancelRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      path: SIEM_RULE_MIGRATIONS_CANCEL_PATH,
      access: 'internal',
      options: { tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(CancelRuleMigrationRequestParams) },
        },
      },
      async (context, req, res): Promise<IKibanaResponse<CancelRuleMigrationResponse>> => {
        const migrationId = req.params.migration_id;
        try {
          const ctx = await context.resolve(['core', 'actions', 'securitySolution']);
          const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
          const { found, cancelled } = await ruleMigrationsClient.task.cancel(migrationId);

          if (!found) {
            return res.noContent();
          }
          return res.ok({ body: { cancelled } });
        } catch (err) {
          logger.error(err);
          return res.badRequest({
            body: err.message,
          });
        }
      }
    );
};
