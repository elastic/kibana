/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { CreateRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rules_migration.gen';
import { CreateRuleMigrationRequestBody } from '../../../../../common/siem_migrations/model/api/rules/rules_migration.gen';
import { SIEM_RULE_MIGRATIONS_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

export const registerSiemRuleMigrationsCreateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATIONS_PATH,
      access: 'internal',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateRuleMigrationRequestBody),
          },
        },
      },
      async (context, req, res): Promise<IKibanaResponse<CreateRuleMigrationResponse>> => {
        const { originalRules } = req.body;
        try {
          const ctx = await context.resolve(['core', 'actions', 'securitySolution']);

          const siemMigrationClient = ctx.securitySolution.getSiemMigrationClient();

          const migrationUuid = 'dummy';
          return res.ok({ body: { migrationUuid } });
        } catch (err) {
          return res.badRequest({
            body: err.message,
          });
        }
      }
    );
};
