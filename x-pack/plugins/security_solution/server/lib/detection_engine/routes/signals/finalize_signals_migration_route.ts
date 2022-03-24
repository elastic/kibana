/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError, BadRequestError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SetupPlugins } from '../../../../plugin';
import { DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL } from '../../../../../common/constants';
import { finalizeSignalsMigrationSchema } from '../../../../../common/detection_engine/schemas/request/finalize_signals_migration_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { isMigrationFailed, isMigrationPending } from '../../migrations/helpers';
import { signalsMigrationService } from '../../migrations/migration_service';
import { buildSiemResponse } from '../utils';

import { getMigrationSavedObjectsById } from '../../migrations/get_migration_saved_objects_by_id';
import { RuleDataPluginService } from '../../../../../../rule_registry/server';

export const finalizeSignalsMigrationRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataService: RuleDataPluginService,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
      validate: {
        body: buildRouteValidation(finalizeSignalsMigrationSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const soClient = context.core.savedObjects.client;
      const { migration_ids: migrationIds } = request.body;

      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const user = await security?.authc.getCurrentUser(request);
        const migrationService = signalsMigrationService({
          esClient,
          soClient,
          username: user?.username ?? 'elastic',
        });
        const migrations = await getMigrationSavedObjectsById({
          ids: migrationIds,
          soClient,
        });

        const spaceId = context.securitySolution.getSpaceId();
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
