/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';
import { schema } from '@kbn/config-schema';
import { MVT_GETTILE_API_PATH, API_ROOT_PATH } from '../../common/constants';
import { getTile } from './get_tile';

const CACHE_TIMEOUT = 0;

export function initMVTRoutes({ router, logger }) {
  logger.info('init mvt routes');
  logger.warn('init');

  router.get(
    {
      path: `${API_ROOT_PATH}/${MVT_GETTILE_API_PATH}`,
      validate: {
        query: schema.object({
          x: schema.number(),
          y: schema.number(),
          z: schema.number(),
          geometryFieldName: schema.string(),
          fields: schema.string(),
          requestBody: schema.string(),
          indexPattern: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { query } = request;

      logger.info({ query });

      const callElasticSearch = async (...args) => {
        return await context.core.elasticsearch.legacy.client.callAsCurrentUser(...args);
      };

      const indexPattern = query.indexPattern;

      const x = parseInt(query.x, 10);
      const y = parseInt(query.y, 10);
      const z = parseInt(query.z, 10);

      const geometryFieldName = query.geometryFieldName;
      const fields = query.fields ? query.fields.split(',') : [];
      const size = parseInt(query.size, 10) || 10000;

      logger.info({ size });
      logger.info({ x, y, z });

      const requestBodyDSL = rison.decode(query.requestBody);
      logger.info({ requestBodyDSL });
      const tile = await getTile({
        logger,
        callElasticSearch,
        request,
        size,
        geometryFieldName,
        fields,
        x,
        y,
        z,
        indexPattern,
        requestBody: requestBodyDSL,
      });

      logger.info({ tile });
      if (!tile) {
        logger.info('empty tile');
        return response.ok({
          headers: {
            'content-disposition': 'inline',
            'content-length': 0,
            'Content-Type': 'application/x-protobuf',
            'Cache-Control': `max-age=${CACHE_TIMEOUT}`,
          },
        });
      }

      return response.ok({
        body: tile,
        headers: {
          'content-disposition': 'inline',
          'content-length': tile.length,
          'Content-Type': 'application/x-protobuf',
          'Cache-Control': `max-age=${CACHE_TIMEOUT}`,
        },
      });
    }
  );
}
