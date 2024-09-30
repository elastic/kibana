/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeGeoipDatabase } from './serialization';
import { API_BASE_PATH } from '../../../../common/constants';
import { RouteDependencies } from '../../../types';

const mockedDatabases = [
  {
    id: '_web_R2VvTGl0ZTItQVNOLm1tZGI=',
    version: -1,
    modified_date: '2024-09-25T19:23:15.521Z',
    modified_date_millis: 1727292195521,
    database: {
      name: 'GeoLite2-ASN',
      web: {},
    },
  },
  {
    id: '_web_R2VvTGl0ZTItQ291bnRyeS5tbWRi',
    version: -1,
    modified_date: '2024-09-25T19:23:23.900Z',
    modified_date_millis: 1727292203900,
    database: {
      name: 'GeoLite2-Country',
      web: {},
    },
  },
  {
    id: '_web_R2VvTGl0ZTItQ2l0eS5tbWRi',
    version: -1,
    modified_date: '2024-09-25T19:23:18.109Z',
    modified_date_millis: 1727292198109,
    database: {
      name: 'GeoLite2-City',
      web: {},
    },
  },
  {
    id: '_local_R2VvSVAyLUNpdHktVGVzdC5tbWRi',
    version: -1,
    modified_date: '2024-07-24T16:29:44.000Z',
    modified_date_millis: 1721838584000,
    database: {
      name: 'GeoIP2-City-Test',
      local: {
        type: 'GeoIP2-City',
      },
    },
  },
];

export const registerListGeoipRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.get(
    { path: `${API_BASE_PATH}/geoip_database`, validate: false },
    async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;

      try {
        const data = await clusterClient.asCurrentUser.ingest.getGeoipDatabase();
        const geoipDatabases = [...data.databases, ...mockedDatabases];

        return res.ok({ body: geoipDatabases.map(deserializeGeoipDatabase) });
      } catch (error) {
        const esErrorResponse = handleEsError({ error, response: res });
        if (esErrorResponse.status === 404) {
          // ES returns 404 when there are no pipelines
          // Instead, we return an empty array and 200 status back to the client
          return res.ok({ body: [] });
        }
        return esErrorResponse;
      }
    }
  );
};
