/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { deserializePipelines } from '../../../common/lib';
import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';

const paramsSchema = schema.object({
  name: schema.string(),
});

export const registerGetRoutes = ({
  router,
  license,
  lib: { isEsError },
}: RouteDependencies): void => {
  // Get all pipelines
  router.get(
    { path: API_BASE_PATH, validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;

      try {
        const pipelines = await callAsCurrentUser('ingest.getPipeline');

        return res.ok({ body: deserializePipelines(pipelines) });
      } catch (error) {
        if (isEsError(error)) {
          // ES returns 404 when there are no pipelines
          // Instead, we return an empty array and 200 status back to the client
          if (error.status === 404) {
            return res.ok({ body: [] });
          }

          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );

  // Get single pipeline
  router.get(
    {
      path: `${API_BASE_PATH}/{name}`,
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;
      const { name } = req.params;

      try {
        const pipeline = await callAsCurrentUser('ingest.getPipeline', { id: name });

        return res.ok({
          body: {
            ...pipeline[name],
            name,
          },
        });
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
