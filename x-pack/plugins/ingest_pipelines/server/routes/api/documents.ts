/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';

const paramsSchema = schema.object({
  index: schema.string(),
  id: schema.string(),
});

export const registerDocumentsRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.get(
    {
      path: `${API_BASE_PATH}/documents/{index}/{id}`,
      validate: {
        params: paramsSchema,
      },
    },
    async (ctx, req, res) => {
      const { client: clusterClient } = ctx.core.elasticsearch;
      const { index, id } = req.params;

      try {
        const document = await clusterClient.asCurrentUser.get({ index, id });

        const { _id, _index, _source } = document;

        return res.ok({
          body: {
            _id,
            _index,
            _source,
          },
        });
      } catch (error) {
        return handleEsError({ error, response: res });
      }
    }
  );
};
