/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { GetRuleMigrationPrebuiltRulesResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { GetRuleMigrationPrebuiltRulesRequestParams } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from './util/with_license';
import { getPrebuiltRules } from './util/prebuilt_rules';
import { MAX_PREBUILT_RULES_TO_FETCH } from './constants';

export const registerSiemRuleMigrationsPrebuiltRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetRuleMigrationPrebuiltRulesRequestParams),
          },
        },
      },
      withLicense(
        async (
          context,
          req,
          res
        ): Promise<IKibanaResponse<GetRuleMigrationPrebuiltRulesResponse>> => {
          const { migration_id: migrationId } = req.params;
          try {
            const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            const savedObjectsClient = ctx.core.savedObjects.client;
            const rulesClient = await ctx.alerting.getRulesClient();

            const result = await ruleMigrationsClient.data.rules.get(
              {
                migrationId,
                prebuiltRulesOnly: true,
              },
              0,
              MAX_PREBUILT_RULES_TO_FETCH
            );

            const prebuiltRulesIds = result.data
              .flatMap((rule) => rule.elastic_rule?.prebuilt_rule_id ?? [])
              .filter((value, index, self) => self.indexOf(value) === index);

            const prebuiltRules = await getPrebuiltRules(
              rulesClient,
              savedObjectsClient,
              prebuiltRulesIds
            );

            return res.ok({ body: prebuiltRules });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
