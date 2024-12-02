/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH } from '../../../../../common/siem_migrations/constants';
import type { InstallTranslatedMigrationRulesResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { InstallTranslatedMigrationRulesRequestParams } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from './util/with_license';
import { installTranslated } from './util/installation';

export const registerSiemRuleMigrationsInstallTranslatedRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_RULE_MIGRATION_INSTALL_TRANSLATED_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(InstallTranslatedMigrationRulesRequestParams),
          },
        },
      },
      withLicense(
        async (
          context,
          req,
          res
        ): Promise<IKibanaResponse<InstallTranslatedMigrationRulesResponse>> => {
          const { migration_id: migrationId } = req.params;

          try {
            const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);

            const securitySolutionContext = ctx.securitySolution;
            const savedObjectsClient = ctx.core.savedObjects.client;
            const rulesClient = ctx.alerting.getRulesClient();

            await installTranslated({
              migrationId,
              securitySolutionContext,
              savedObjectsClient,
              rulesClient,
              logger,
            });

            return res.ok({ body: { installed: true } });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
