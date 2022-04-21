/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';

import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';
import { pipelineSchema } from './shared';

const bodySchema = schema.object({
  pipeline: schema.object(pipelineSchema),
  documents: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
  verbose: schema.maybe(schema.boolean()),
});

export const registerSimulateRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.post(
    {
      path: `${API_BASE_PATH}/simulate`,
      validate: {
        body: bodySchema,
      },
    },
    async (ctx, req, res) => {
      const { client: clusterClient } = ctx.core.elasticsearch;

      const { pipeline, documents, verbose } = req.body;

      try {
        const response = await clusterClient.asCurrentUser.ingest.simulate({
          verbose,
          body: {
            pipeline,
            docs: documents as estypes.IngestSimulateDocument[],
          },
        });

        return res.ok({ body: response });
      } catch (error) {
        return handleEsError({ error, response: res });
      }
    }
  );
};
