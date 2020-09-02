/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';
import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import { IRouter } from 'src/core/server';
import { MVT_GETTILE_API_PATH, API_ROOT_PATH } from '../../common/constants';
import { getTile } from './get_tile';

const CACHE_TIMEOUT = 0; // Todo. determine good value. Unsure about full-implications (e.g. wrt. time-based data).

export function initMVTRoutes({ router, logger }: { logger: Logger; router: IRouter }) {
  router.get(
    {
      path: `${API_ROOT_PATH}/${MVT_GETTILE_API_PATH}`,
      validate: {
        query: schema.object({
          x: schema.number(),
          y: schema.number(),
          z: schema.number(),
          geometryFieldName: schema.string(),
          requestBody: schema.string(),
          index: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { query } = request;

      const callElasticsearch = async (type: string, ...args: any[]): Promise<unknown> => {
        return await context.core.elasticsearch.legacy.client.callAsCurrentUser(type, ...args);
      };

      const requestBodyDSL = rison.decode(query.requestBody);

      const tile = await getTile({
        logger,
        callElasticsearch,
        geometryFieldName: query.geometryFieldName,
        x: query.x,
        y: query.y,
        z: query.z,
        index: query.index,
        requestBody: requestBodyDSL,
      });

      if (tile) {
        return response.ok({
          body: tile,
          headers: {
            'content-disposition': 'inline',
            'content-length': `${tile.length}`,
            'Content-Type': 'application/x-protobuf',
            'Cache-Control': `max-age=${CACHE_TIMEOUT}`,
          },
        });
      } else {
        return response.ok({
          headers: {
            'content-disposition': 'inline',
            'content-length': '0',
            'Content-Type': 'application/x-protobuf',
            'Cache-Control': `max-age=${CACHE_TIMEOUT}`,
          },
        });
      }
    }
  );
}
