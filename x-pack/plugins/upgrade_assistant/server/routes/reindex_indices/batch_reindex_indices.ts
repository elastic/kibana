/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';

import { API_BASE_PATH } from '../../../common/constants';
import { ReindexStatus } from '../../../common/types';
import { versionCheckHandlerWrapper } from '../../lib/es_version_precheck';
import { ReindexWorker } from '../../lib/reindexing';
import { reindexActionsFactory } from '../../lib/reindexing/reindex_actions';
import { sortAndOrderReindexOperations } from '../../lib/reindexing/op_utils';
import { RouteDependencies } from '../../types';
import { mapAnyErrorToKibanaHttpResponse } from './map_any_error_to_kibana_http_response';
import { reindexHandler } from './reindex_handler';
import { GetBatchQueueResponse, PostBatchResponse } from './types';

export function registerBatchReindexIndicesRoutes(
  {
    credentialStore,
    router,
    licensing,
    log,
    getSecurityPlugin,
    lib: { handleEsError },
  }: RouteDependencies,
  getWorker: () => ReindexWorker
) {
  const BASE_PATH = `${API_BASE_PATH}/reindex`;

  // Get the current batch queue
  router.get(
    {
      path: `${BASE_PATH}/batch/queue`,
      validate: {},
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
        savedObjects,
      } = await core;
      const { client } = savedObjects;
      const callAsCurrentUser = esClient.asCurrentUser;
      const reindexActions = reindexActionsFactory(client, callAsCurrentUser);
      try {
        const inProgressOps = await reindexActions.findAllByStatus(ReindexStatus.inProgress);
        const { queue } = sortAndOrderReindexOperations(inProgressOps);
        const result: GetBatchQueueResponse = {
          queue: queue.map((savedObject) => savedObject.attributes),
        };
        return response.ok({
          body: result,
        });
      } catch (error) {
        if (error instanceof errors.ResponseError) {
          return handleEsError({ error, response });
        }
        return mapAnyErrorToKibanaHttpResponse(error);
      }
    })
  );

  // Add indices for reindexing to the worker's batch
  router.post(
    {
      path: `${BASE_PATH}/batch`,
      validate: {
        body: schema.object({
          indexNames: schema.arrayOf(schema.string()),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        savedObjects: { client: savedObjectsClient },
        elasticsearch: { client: esClient },
      } = await core;
      const { indexNames } = request.body;
      const results: PostBatchResponse = {
        enqueued: [],
        errors: [],
      };
      for (const indexName of indexNames) {
        try {
          const result = await reindexHandler({
            savedObjects: savedObjectsClient,
            dataClient: esClient,
            indexName,
            log,
            licensing,
            request,
            credentialStore,
            reindexOptions: {
              enqueue: true,
            },
            security: getSecurityPlugin(),
          });
          results.enqueued.push(result);
        } catch (e) {
          results.errors.push({
            indexName,
            message: e.message,
          });
        }
      }

      if (results.errors.length < indexNames.length) {
        // Kick the worker on this node to immediately pickup the batch.
        getWorker().forceRefresh();
      }

      return response.ok({ body: results });
    })
  );
}
