/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteDependencies } from '../../../types';
import { API_BASE_PATH } from '../../../../common/constants';

const paramsSchema = schema.object({
  database_id: schema.string(),
});

export const registerDeleteGeoipRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.delete(
    {
      path: `${API_BASE_PATH}/geoip_database/{database_id}`,
      validate: {
        params: paramsSchema,
      },
    },
    async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;
      const { database_id: databaseID } = req.params;

      try {
        await clusterClient.asCurrentUser.transport.request({
          method: 'DELETE',
          path: `/_ingest/geoip/database/${databaseID}`,
        });

        return res.ok();
      } catch (error) {
        return handleEsError({ error, response: res });
      }
    }
  );
};
