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
import { decodeMigrationToken } from '../../migrations/helpers';
import { applyMigrationCleanupPolicy } from '../../migrations/migration_cleanup';
import { replaceSignalsIndexAlias } from '../../migrations/replace_signals_index_alias';
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
      const { migration_token: migrationToken } = request.body;

      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const { destinationIndex, sourceIndex, taskId } = decodeMigrationToken(migrationToken);
        const { body: task } = await esClient.tasks.get<TaskResponse>({ task_id: taskId });

        if (!task.completed) {
          return response.ok({
            body: {
              completed: false,
              index: sourceIndex,
              migration_index: destinationIndex,
              migration_task_id: taskId,
              migration_token: migrationToken,
            },
          });
        }

        const { description } = task.task;
        if (
          !description ||
          !description.includes(destinationIndex) ||
          !description.includes(sourceIndex)
        ) {
          throw new BadRequestError(
            `The specified task does not match the source and destination indexes. Task [${taskId}] did not specify source index [${sourceIndex}] and destination index [${destinationIndex}]`
          );
        }

        const sourceCount = await getIndexCount({ esClient, index: sourceIndex });
        const destinationCount = await getIndexCount({ esClient, index: destinationIndex });
        if (sourceCount !== destinationCount) {
          throw new Error(
            `The source and destination indexes have different document counts. Source [${sourceIndex}] has [${sourceCount}] documents, while destination [${destinationIndex}] has [${destinationCount}] documents.`
          );
        }

        const signalsIndex = appClient.getSignalsIndex();
        await replaceSignalsIndexAlias({
          alias: signalsIndex,
          esClient,
          newIndex: destinationIndex,
          oldIndex: sourceIndex,
        });

        await applyMigrationCleanupPolicy({ alias: signalsIndex, esClient, index: sourceIndex });
        await esClient.delete({ index: '.tasks', id: taskId });

        return response.ok({
          body: {
            completed: true,
            index: sourceIndex,
            migration_index: destinationIndex,
            migration_task_id: taskId,
            migration_token: migrationToken,
          },
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
