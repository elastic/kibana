/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReindexResponse } from 'elasticsearch';

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL } from '../../../../../common/constants';
import { finalizeSignalsMigrationSchema } from '../../../../../common/detection_engine/schemas/request/finalize_signals_migration_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { BadRequestError } from '../../errors/bad_request_error';
import { getIndexCount } from '../../index/get_index_count';
import { getMigrations } from '../../migrations/get_migration_status';
import { isMigrationFailed, isMigrationSuccess } from '../../migrations/helpers';
import { applyMigrationCleanupPolicy } from '../../migrations/migration_cleanup';
import { replaceSignalsIndexAlias } from '../../migrations/replace_signals_index_alias';
import { signalsMigrationSOService } from '../../migrations/saved_objects_service';
import { buildSiemResponse, transformError } from '../utils';

interface TaskResponse {
  completed: boolean;
  response?: ReindexResponse;
  task: { description?: string };
}

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
        const migrationService = signalsMigrationSOService(soClient);
        const migrationsByIndex = await getMigrations({ soClient, index: indices });

        const finalizeResults = await Promise.all(
          indices.map(async (index) => {
            try {
              const migrations = migrationsByIndex[index];
              if (migrations == null || migrations.length === 0) {
                throw new BadRequestError('The specified index has no migrations');
              }

              const [migration] = migrations;
              if (isMigrationFailed(migration)) {
                throw new BadRequestError(
                  "The specified index's latest migration was not successful."
                );
              }
              if (isMigrationSuccess(migration)) {
                return {
                  index,
                  completed: true,
                  migration_id: migration.id,
                  migration_index: migration.attributes.destinationIndex,
                };
              }

              const { destinationIndex, sourceIndex, taskId } = migration.attributes;
              const { body: task } = await esClient.tasks.get<TaskResponse>({ task_id: taskId });

              if (!task.completed) {
                return {
                  index,
                  completed: false,
                  migration_id: migration.id,
                  migration_index: migration.attributes.destinationIndex,
                };
              }

              const sourceCount = await getIndexCount({ esClient, index: sourceIndex });
              const destinationCount = await getIndexCount({ esClient, index: destinationIndex });
              if (sourceCount !== destinationCount) {
                await migrationService.update(migration.id, { status: 'failure' });
                throw new BadRequestError(
                  `The source and destination indexes have different document counts. Source [${sourceIndex}] has [${sourceCount}] documents, while destination [${destinationIndex}] has [${destinationCount}] documents.`
                );
              }

              // all checks passed, we can finalize this migration
              const signalsAlias = appClient.getSignalsIndex();
              await replaceSignalsIndexAlias({
                alias: signalsAlias,
                esClient,
                newIndex: destinationIndex,
                oldIndex: sourceIndex,
              });

              await applyMigrationCleanupPolicy({
                alias: signalsAlias,
                esClient,
                index: sourceIndex,
              });
              await esClient.delete({ index: '.tasks', id: taskId });
              await migrationService.update(migration.id, { status: 'success' });
              return {
                index,
                completed: true,
                migration_id: migration.id,
                migration_index: migration.attributes.destinationIndex,
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
        console.log('ERRRRRRRR', err);
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
