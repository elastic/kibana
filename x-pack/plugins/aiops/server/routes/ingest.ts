/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

// import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';
import type { AiopsLicense } from '../types';

import { wrapError } from './error_wrapper';

export const defineUpdateIngestRoute = (
  router: IRouter<DataRequestHandlerContext>,
  license: AiopsLicense,
  logger: Logger,
  coreStart: CoreStart
) => {
  router.post(
    {
      path: '/internal/aiops/update_ingest',
      validate: {
        body: schema.object({
          indexName: schema.string(),
          pipeline: schema.any(),
          mappings: schema.any(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const {
          body: { indexName, pipeline, mappings },
        } = request;
        const pipelineId = 'test-pipeline';
        const esClient = (await context.core).elasticsearch.client;
        await esClient.asCurrentUser.indices.putMapping({ index: indexName, body: mappings });
        await esClient.asCurrentUser.ingest.putPipeline({ id: pipelineId, ...pipeline });
        await esClient.asCurrentUser.indices.putSettings({
          index: indexName,
          settings: {
            index: {
              default_pipeline: pipelineId,
            },
          },
        });
        // const result = await analyzeFile(esClient, request.body, request.query);
        return response.ok({ body: {} });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    }
  );
};
