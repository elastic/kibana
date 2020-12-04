/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ReindexResponse } from 'elasticsearch';

import { IRouter } from 'src/core/server';
import { DETECTION_ENGINE_FINALIZE_SIGNALS_UPGRADE_URL } from '../../../../../common/constants';
import { buildSiemResponse, transformError } from '../utils';

interface TaskResponse {
  completed: boolean;
  response?: ReindexResponse;
  task: unknown;
}

export const finalizeSignalsUpgradeRoute = (router: IRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_FINALIZE_SIGNALS_UPGRADE_URL,
      // TODO io-ts
      validate: {
        body: schema.object({ task_id: schema.string() }),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const { task_id: taskId } = request.body;

      // TODO permissions check
      try {
        const appClient = context.securitySolution?.getAppClient();
        if (!appClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const { body: task } = await esClient.tasks.get<TaskResponse>({ task_id: taskId });
        console.log('response', JSON.stringify(task, null, 2));

        if (!task.completed) {
          return response.ok({ body: { task_id: taskId } });
        }

        // TODO
        // verify docs match
        // update_by_query for signal.schema_version
        // update aliases

        return response.ok({ body: {} });
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
