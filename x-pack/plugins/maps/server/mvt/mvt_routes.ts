/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from 'rison-node';
import { schema } from '@kbn/config-schema';
import { KibanaRequest, KibanaResponseFactory, Logger } from 'src/core/server';
import { IRouter } from 'src/core/server';
import type { DataRequestHandlerContext } from 'src/plugins/data/server';
import {
  MVT_GETTILE_API_PATH,
  API_ROOT_PATH,
  MVT_GETGRIDTILE_API_PATH,
  ES_GEO_FIELD_TYPE,
  RENDER_AS,
} from '../../common/constants';
import { getGridTile, getTile } from './get_tile';

const CACHE_TIMEOUT_SECONDS = 60 * 60;

export function initMVTRoutes({
  router,
  logger,
}: {
  router: IRouter<DataRequestHandlerContext>;
  logger: Logger;
}) {
  router.get(
    {
      path: `${API_ROOT_PATH}/${MVT_GETTILE_API_PATH}/{z}/{x}/{y}.pbf`,
      validate: {
        params: schema.object({
          x: schema.number(),
          y: schema.number(),
          z: schema.number(),
        }),
        query: schema.object({
          geometryFieldName: schema.string(),
          requestBody: schema.string(),
          index: schema.string(),
          geoFieldType: schema.string(),
          searchSessionId: schema.maybe(schema.string()),
          token: schema.maybe(schema.string()),
        }),
      },
    },
    async (
      context: DataRequestHandlerContext,
      request: KibanaRequest<unknown, Record<string, any>, unknown>,
      response: KibanaResponseFactory
    ) => {
      const { query, params } = request;

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      const requestBodyDSL = rison.decode(query.requestBody as string);

      const tile = await getTile({
        logger,
        context,
        geometryFieldName: query.geometryFieldName as string,
        x: parseInt((params as any).x, 10) as number,
        y: parseInt((params as any).y, 10) as number,
        z: parseInt((params as any).z, 10) as number,
        index: query.index as string,
        requestBody: requestBodyDSL as any,
        geoFieldType: query.geoFieldType as ES_GEO_FIELD_TYPE,
        searchSessionId: query.searchSessionId,
        abortSignal: abortController.signal,
      });

      return sendResponse(response, tile);
    }
  );

  router.get(
    {
      path: `${API_ROOT_PATH}/${MVT_GETGRIDTILE_API_PATH}/{z}/{x}/{y}.pbf`,
      validate: {
        params: schema.object({
          x: schema.number(),
          y: schema.number(),
          z: schema.number(),
        }),
        query: schema.object({
          geometryFieldName: schema.string(),
          requestBody: schema.string(),
          index: schema.string(),
          requestType: schema.string(),
          geoFieldType: schema.string(),
          searchSessionId: schema.maybe(schema.string()),
          token: schema.maybe(schema.string()),
        }),
      },
    },
    async (
      context: DataRequestHandlerContext,
      request: KibanaRequest<unknown, Record<string, any>, unknown>,
      response: KibanaResponseFactory
    ) => {
      const { query, params } = request;
      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      const requestBodyDSL = rison.decode(query.requestBody as string);

      const tile = await getGridTile({
        logger,
        context,
        geometryFieldName: query.geometryFieldName as string,
        x: parseInt((params as any).x, 10) as number,
        y: parseInt((params as any).y, 10) as number,
        z: parseInt((params as any).z, 10) as number,
        index: query.index as string,
        requestBody: requestBodyDSL as any,
        requestType: query.requestType as RENDER_AS.POINT | RENDER_AS.GRID,
        geoFieldType: query.geoFieldType as ES_GEO_FIELD_TYPE,
        searchSessionId: query.searchSessionId,
        abortSignal: abortController.signal,
      });

      return sendResponse(response, tile);
    }
  );
}

function sendResponse(response: KibanaResponseFactory, tile: any) {
  const headers = {
    'content-disposition': 'inline',
    'content-length': tile ? `${tile.length}` : `0`,
    'Content-Type': 'application/x-protobuf',
    'Cache-Control': `public, max-age=${CACHE_TIMEOUT_SECONDS}`,
    'Last-Modified': `${new Date().toUTCString()}`,
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
