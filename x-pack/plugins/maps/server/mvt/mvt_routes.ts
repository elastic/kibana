/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';
import { schema } from '@kbn/config-schema';
import {
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RequestHandlerContext,
} from 'src/core/server';
import { IRouter } from 'src/core/server';
import {
  MVT_GETTILE_API_PATH,
  API_ROOT_PATH,
  MVT_GETGRIDTILE_API_PATH,
} from '../../common/constants';
import { getGridTile, getTile } from './get_tile';

const CACHE_TIMEOUT = 0; // Todo. determine good value. Unsure about full-implications (e.g. wrt. time-based data).

// context: RequestHandlerContext,
//   request: KibanaRequest<P, Q, B, Method>,
//   response: ResponseFactory

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
    async (
      context: RequestHandlerContext,
      request: KibanaRequest,
      response: KibanaResponseFactory
    ) => {
      const { query } = request;
      const requestBodyDSL = rison.decode(query.requestBody);

      const tile = await getTile({
        logger,
        callElasticsearch: makeCallElasticsearch(context),
        geometryFieldName: query.geometryFieldName,
        x: query.x,
        y: query.y,
        z: query.z,
        index: query.index,
        requestBody: requestBodyDSL,
      });

      return sendResponse(response, tile);
    }
  );

  router.get(
    {
      path: `${API_ROOT_PATH}/${MVT_GETGRIDTILE_API_PATH}`,
      validate: {
        query: schema.object({
          x: schema.number(),
          y: schema.number(),
          z: schema.number(),
          geometryFieldName: schema.string(),
          requestBody: schema.string(),
          index: schema.string(),
          requestType: schema.string(),
          geoFieldType: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { query } = request;
      const requestBodyDSL = rison.decode(query.requestBody);

      const tile = await getGridTile({
        logger,
        callElasticsearch: makeCallElasticsearch(context),
        geometryFieldName: query.geometryFieldName,
        x: query.x,
        y: query.y,
        z: query.z,
        index: query.index,
        requestBody: requestBodyDSL,
        requestType: query.requestType,
        geoFieldType: query.geoFieldType,
      });

      return sendResponse(response, tile);
    }
  );
}

function sendResponse(response: KibanaResponseFactory, tile: unknown) {
  const headers = {
    'content-disposition': 'inline',
    'content-length': tile ? `${tile.length}` : 0,
    'Content-Type': 'application/x-protobuf',
    'Cache-Control': `max-age=${CACHE_TIMEOUT}`,
  };

  if (tile) {
    return response.ok({
      body: tile,
      headers,
    });
  } else {
    return response.ok({
      headers,
    });
  }
}

function makeCallElasticsearch(context: RequestHandlerContext) {
  return async (type: string, ...args: any[]): Promise<unknown> => {
    return context.core.elasticsearch.legacy.client.callAsCurrentUser(type, ...args);
  };
}
