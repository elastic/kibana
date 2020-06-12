/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';
import { pipelineSchema } from './pipeline_schema';

const bodySchema = schema.object({
  pipeline: schema.object(pipelineSchema),
  documents: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
  verbose: schema.maybe(schema.boolean()),
});

export const registerSimulateRoute = ({
  router,
  license,
  lib: { isEsError },
}: RouteDependencies): void => {
  router.post(
    {
      path: `${API_BASE_PATH}/simulate`,
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;

      const { pipeline, documents, verbose } = req.body;

      try {
        const response = await callAsCurrentUser('ingest.simulate', {
          verbose,
          body: {
            pipeline,
            docs: documents,
          },
        });

        return res.ok({ body: response });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );
};
