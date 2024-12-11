/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksServiceSetup } from '@kbn/core/server';
import { transformError, BadRequestError } from '@kbn/securitysolution-es-utils';
import type { RuleDataPluginService } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { FinalizeAlertsMigrationRequestBody } from '../../../../../common/api/detection_engine/signals_migration';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL } from '../../../../../common/constants';
import { isMigrationFailed, isMigrationPending } from '../../migrations/helpers';
import { signalsMigrationService } from '../../migrations/migration_service';
import { buildSiemResponse } from '../utils';

import { getMigrationSavedObjectsById } from '../../migrations/get_migration_saved_objects_by_id';

export const finalizeSignalsMigrationRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataService: RuleDataPluginService,
  docLinks: DocLinksServiceSetup
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: buildRouteValidationWithZod(FinalizeAlertsMigrationRequestBody) },
        },
        options: {
          deprecated: {
            documentationUrl: docLinks.links.securitySolution.signalsMigrationApi,
            severity: 'warning',
            reason: { type: 'remove' },
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        const core = await context.core;
        const securitySolution = await context.securitySolution;

        const esClient = core.elasticsearch.client.asCurrentUser;
        const soClient = core.savedObjects.client;
        const { migration_ids: migrationIds } = request.body;

        try {
          const appClient = securitySolution?.getAppClient();
          if (!appClient) {
            return siemResponse.error({ statusCode: 404 });
          }
          const user = core.security.authc.getCurrentUser();
          const migrationService = signalsMigrationService({
            esClient,
            soClient,
            username: user?.username ?? 'elastic',
          });
          const migrations = await getMigrationSavedObjectsById({
            ids: migrationIds,
            soClient,
          });

          const spaceId = securitySolution.getSpaceId();
          const signalsAlias = ruleDataService.getResourceName(`security.alerts-${spaceId}`);
          const finalizeResults = await Promise.all(
            migrations.map(async (migration) => {
              try {
                const finalizedMigration = await migrationService.finalize({
                  migration,
                  signalsAlias,
                });

                if (isMigrationFailed(finalizedMigration)) {
                  throw new BadRequestError(
                    finalizedMigration.attributes.error ?? 'The migration was not successful.'
                  );
                }

                return {
                  id: finalizedMigration.id,
                  completed: !isMigrationPending(finalizedMigration),
                  destinationIndex: finalizedMigration.attributes.destinationIndex,
                  status: finalizedMigration.attributes.status,
                  sourceIndex: finalizedMigration.attributes.sourceIndex,
                  version: finalizedMigration.attributes.version,
                  updated: finalizedMigration.attributes.updated,
                };
              } catch (err) {
                const error = transformError(err);
                return {
                  id: migration.id,
                  destinationIndex: migration.attributes.destinationIndex,
                  error: {
                    message: error.message,
                    status_code: error.statusCode,
                  },
                  status: migration.attributes.status,
                  sourceIndex: migration.attributes.sourceIndex,
                  version: migration.attributes.version,
                  updated: migration.attributes.updated,
                };
              }
            })
          );

          return response.ok({
            body: { migrations: finalizeResults },
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
