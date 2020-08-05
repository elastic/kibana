/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';

const paramsSchema = schema.object({
  names: schema.string(),
});

export const registerDeleteRoute = ({ router, license }: RouteDependencies): void => {
  router.delete(
    {
      path: `${API_BASE_PATH}/{names}`,
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;
      const { names } = req.params;
      const pipelineNames = names.split(',');

      const response: { itemsDeleted: string[]; errors: any[] } = {
        itemsDeleted: [],
        errors: [],
      };

      await Promise.all(
        pipelineNames.map((pipelineName) => {
          return callAsCurrentUser('ingest.deletePipeline', { id: pipelineName })
            .then(() => response.itemsDeleted.push(pipelineName))
            .catch((e) =>
              response.errors.push({
                name: pipelineName,
                error: e,
              })
            );
        })
      );

      return res.ok({ body: response });
    })
  );
};
