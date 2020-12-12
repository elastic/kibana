/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL } from '../../../../../common/constants';
import { finalizeSignalsMigrationSchema } from '../../../../../common/detection_engine/schemas/request/finalize_signals_migration_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { BadRequestError } from '../../errors/bad_request_error';
import { isMigrationFailed, isMigrationPending } from '../../migrations/helpers';
import { signalsMigrationService } from '../../migrations/migration_service';
import { buildSiemResponse, transformError } from '../utils';
import { getMigrationSavedObjectsByIndex } from '../../migrations/get_migration_saved_objects_by_index';

export const finalizeSignalsMigrationRoute = (router: IRouter) => {
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
      const { index: indices } = request.body;

      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const migrationService = signalsMigrationService({ esClient, soClient, username: 'TODO' });
        const migrationsByIndex = await getMigrationSavedObjectsByIndex({
          soClient,
          index: indices,
        });

        const finalizeResults = await Promise.all(
          indices.map(async (index) => {
            try {
              const migrations = migrationsByIndex[index] ?? [];
              if (migrations.length === 0) {
                throw new BadRequestError('The specified index has no migrations');
              }

              const finalizedMigration = await migrationService.finalize({
                migration: migrations[0],
                signalsAlias: appClient.getSignalsIndex(),
              });

              if (isMigrationFailed(finalizedMigration)) {
                throw new BadRequestError(
                  finalizedMigration.attributes.error ??
                    "The specified index's latest migration was not successful."
                );
              }

              return {
                index,
                completed: !isMigrationPending(finalizedMigration),
                migration_id: finalizedMigration.id,
                migration_index: finalizedMigration.attributes.destinationIndex,
              };
            } catch (err) {
              const error = transformError(err);
              return {
                index,
                error: {
                  message: error.message,
                  status_code: error.statusCode,
                },
                migration_id: null,
                migration_index: null,
              };
            }
          })
        );

        return response.ok({
          body: { indices: finalizeResults },
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
