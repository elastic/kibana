/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { v4 as uuidV4 } from 'uuid';
import { SIEM_RULE_MIGRATION_CREATE_PATH } from '../../../../../common/siem_migrations/constants';
import {
  CreateRuleMigrationRequestBody,
  CreateRuleMigrationRequestParams,
  type CreateRuleMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { CreateRuleMigrationInput } from '../data/rule_migrations_data_rules_client';
import { withLicense } from './util/with_license';

export const registerSiemRuleMigrationsCreateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_CREATE_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateRuleMigrationRequestBody),
            params: buildRouteValidationWithZod(CreateRuleMigrationRequestParams),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<CreateRuleMigrationResponse>> => {
          const originalRules = req.body;
          const migrationId = req.params.migration_id ?? uuidV4();
          try {
            const ctx = await context.resolve(['securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();

            const ruleMigrations = originalRules.map<CreateRuleMigrationInput>((originalRule) => ({
              migration_id: migrationId,
              original_rule: originalRule,
            }));
            await ruleMigrationsClient.data.integrations.create();
            await ruleMigrationsClient.data.rules.create(ruleMigrations);

            return res.ok({ body: { migration_id: migrationId } });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
