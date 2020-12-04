/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ReindexResponse } from 'elasticsearch';

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL } from '../../../../../common/constants';
import { getIndexCount } from '../../index/get_index_count';
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
      // TODO io-ts
      validate: {
        body: schema.object({
          destination_index: schema.string(),
          source_index: schema.string(),
          task_id: schema.string(),
        }),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const {
        destination_index: destinationIndex,
        source_index: sourceIndex,
        task_id: taskId,
      } = request.body;

      // TODO permissions check
      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const { body: task } = await esClient.tasks.get<TaskResponse>({ task_id: taskId });

        if (!task.completed) {
          return response.ok({
            body: {
              completed: false,
              destination_index: destinationIndex,
              source_index: sourceIndex,
              task_id: taskId,
            },
          });
        }

        const { description } = task.task;
        if (
          !description ||
          !description.includes(destinationIndex) ||
          !description.includes(sourceIndex)
        ) {
          throw new Error(
            `The specified task does not match the source and destination indexes. Task [${taskId}] did not specify source index [${sourceIndex}] and destination index [${destinationIndex}] `
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

        return response.ok({
          body: {
            completed: true,
            destination_index: destinationIndex,
            source_index: sourceIndex,
            task_id: taskId,
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
