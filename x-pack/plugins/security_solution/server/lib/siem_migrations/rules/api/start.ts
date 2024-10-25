/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { StartRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rules_migration.gen';
import {
  StartRuleMigrationRequestBody,
  StartRuleMigrationRequestParams,
} from '../../../../../common/siem_migrations/model/api/rules/rules_migration.gen';
import { SIEM_RULE_MIGRATIONS_START_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

export const registerSiemRuleMigrationsStartRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      path: SIEM_RULE_MIGRATIONS_START_PATH,
      access: 'internal',
      options: { tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(StartRuleMigrationRequestParams),
            body: buildRouteValidationWithZod(StartRuleMigrationRequestBody),
          },
        },
      },
      async (context, req, res): Promise<IKibanaResponse<StartRuleMigrationResponse>> => {
        const migrationId = req.params.migration_id;
        // const { langSmithOptions, connectorId } = req.body;
        try {
          const ctx = await context.resolve(['core', 'actions', 'securitySolution']);
          const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

          const { found, started } = await ruleMigrationsClient.task.start(migrationId);

          if (!found) {
            return res.noContent();
          }
          return res.ok({ body: { started } });
        } catch (err) {
          logger.error(err);
          return res.badRequest({
            body: err.message,
          });
        }
      }
    );
};
