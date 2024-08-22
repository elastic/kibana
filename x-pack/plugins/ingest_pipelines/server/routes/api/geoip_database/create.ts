/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteDependencies } from '../../../types';
import { API_BASE_PATH } from '../../../../common/constants';
import { GeoipDatabase, serializeGeoipDatabase } from './deserialize_geoip_database';
import { normalizeDatabaseName } from './normalize_database_name';

const bodySchema = schema.object({
  maxmind: schema.string({ maxLength: 1000 }),
  databaseName: schema.string({ maxLength: 1000 }),
});

export const registerCreateGeoipRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.post(
    {
      path: `${API_BASE_PATH}/geoip_database`,
      validate: {
        body: bodySchema,
      },
    },
    async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;
      const { maxmind, databaseName } = req.body as { maxmind: string; databaseName: string };
      const serializedDatabase = serializeGeoipDatabase({ databaseName, maxmind });
      const normalizedDatabaseName = normalizeDatabaseName(databaseName);

      try {
        await clusterClient.asCurrentUser.transport.request<{
          databases: GeoipDatabase[];
        }>({
          method: 'PUT',
          path: `/_ingest/geoip/database/${normalizedDatabaseName}`,
          body: serializedDatabase,
        });

        return res.ok();
      } catch (error) {
        return handleEsError({ error, response: res });
      }
    }
  );
};
