/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_SIGNALS_MIGRATION_URL } from '../../../../../common/constants';
import { deleteSignalsMigrationSchema } from '../../../../../common/detection_engine/schemas/request/delete_signals_migration_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { buildSiemResponse, transformError } from '../utils';
import { BadRequestError } from '../../errors/bad_request_error';
import { signalsMigrationService } from '../../migrations/migration_service';
import { getMigrationSavedObjectsByIndex } from '../../migrations/get_migration_saved_objects_by_index';

export const deleteSignalsMigrationRoute = (router: IRouter) => {
  router.delete(
    {
      path: DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
      validate: {
        body: buildRouteValidation(deleteSignalsMigrationSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { index: indices } = request.body;

      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const soClient = context.core.savedObjects.client;
        const migrationService = signalsMigrationService({ esClient, soClient, username: 'TODO' });
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const signalsAlias = appClient.getSignalsIndex();
        const migrationsByIndex = await getMigrationSavedObjectsByIndex({
          index: indices,
          soClient,
        });

        const deletionResults = await Promise.all(
          indices.map(async (index) => {
            try {
              const migrations = migrationsByIndex[index] ?? [];
              if (migrations.length === 0) {
                throw new BadRequestError('The specified index has no migrations');
              }

              const deletedMigrations = await Promise.all(
                migrations.map((migration) =>
                  migrationService.delete({
                    migration,
                    signalsAlias,
                  })
                )
              );

              return {
                index,
                migrations: deletedMigrations,
              };
            } catch (err) {
              const error = transformError(err);
              return {
                index,
                migrations: null,
                error: {
                  message: error.message,
                  status_code: error.statusCode,
                },
              };
            }
          })
        );

        return response.ok({ body: { indices: deletionResults } });
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
