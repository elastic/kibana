/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
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
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
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
        const { langsmith_options: langsmithOptions, connector_id: connectorId } = req.body;

        try {
          const ctx = await context.resolve([
            'core',
            'actions',
            'alerting',
            'securitySolution',
            'licensing',
          ]);
          if (!ctx.licensing.license.hasAtLeast('enterprise')) {
            return res.forbidden({
              body: 'You must have a trial or enterprise license to use this feature',
            });
          }

          const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
          const inferenceClient = ctx.securitySolution.getInferenceClient();
          const actionsClient = ctx.actions.getActionsClient();
          const soClient = ctx.core.savedObjects.client;
          const rulesClient = ctx.alerting.getRulesClient();

          const invocationConfig = {
            callbacks: [
              new APMTracer({ projectName: langsmithOptions?.project_name ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langsmithOptions, logger }),
            ],
          };

          const { exists, started } = await ruleMigrationsClient.task.start({
            migrationId,
            connectorId,
            invocationConfig,
            inferenceClient,
            actionsClient,
            soClient,
            rulesClient,
          });

          if (!exists) {
            return res.noContent();
          }
          return res.ok({ body: { started } });
        } catch (err) {
          logger.error(err);
          return res.badRequest({ body: err.message });
        }
      }
    );
};
