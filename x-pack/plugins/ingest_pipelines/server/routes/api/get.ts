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
  lib: { handleErrors },
}: RouteDependencies): void => {
  // Get all pipelines
  router.get(
    { path: API_BASE_PATH, validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const requestHandler = async () => {
        const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;

        const pipelines = await callAsCurrentUser('ingest.getPipeline');
        return res.ok({ body: deserializePipelines(pipelines) });
      };

      const customErrorHandler = (error: any) => {
        if (error.statusCode === 404) {
          return res.ok({ body: [] });
        }
      };

      return handleErrors(res, requestHandler, customErrorHandler);
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
      const requestHandler = async () => {
        const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;
        const { name } = req.params;

        const pipeline = await callAsCurrentUser('ingest.getPipeline', { id: name });

        return res.ok({
          body: {
            ...pipeline[name],
            name,
          },
        });
      };

      return handleErrors(res, requestHandler);
    })
  );
};
