/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { RuleMigrationToInstall } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { canInstallMigrationRule } from '../../../../../../common/siem_migrations/utils';
import { SIEM_RULE_MIGRATION_INSTALL_ALL_PATH } from '../../../../../../common/siem_migrations/constants';
import type { InstallAllMigrationRulesResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { InstallAllMigrationRulesRequestBody } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { withLicense } from '../util/with_license';
import { installRules } from './helpers';

export const registerInstallAllMigrationRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_INSTALL_ALL_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(InstallAllMigrationRulesRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<InstallAllMigrationRulesResponse>> => {
          const { migrationId } = req.body;

          try {
            const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);

            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            const soClient = ctx.core.savedObjects.client;
            const rulesClient = ctx.alerting.getRulesClient();

            const migrationRules = await ruleMigrationsClient.data.rules.get(migrationId);

            const rulesToInstall: RuleMigrationToInstall[] = [];
            migrationRules.forEach((rule) => {
              if (rule.elastic_rule && !rule.elastic_rule.id && canInstallMigrationRule(rule)) {
                rulesToInstall.push({
                  id: rule.id,
                  elastic_rule: rule.elastic_rule,
                });
              }
            });

            await installRules(rulesToInstall, ctx.securitySolution, rulesClient, soClient, logger);

            return res.ok({ body: { installed: true } });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
