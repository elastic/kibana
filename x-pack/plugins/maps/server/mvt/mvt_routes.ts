/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stream } from 'stream';
import { IncomingHttpHeaders } from 'http';
import { schema } from '@kbn/config-schema';
import { CoreStart, KibanaRequest, KibanaResponseFactory, Logger } from 'src/core/server';
import { IRouter } from 'src/core/server';
import type { DataRequestHandlerContext } from 'src/plugins/data/server';
import {
  MVT_GETTILE_API_PATH,
  API_ROOT_PATH,
  MVT_GETGRIDTILE_API_PATH,
  RENDER_AS,
} from '../../common/constants';
import { decodeMvtResponseBody } from '../../common/mvt_request_body';
import { getEsTile } from './get_tile';
import { getEsGridTile } from './get_grid_tile';

const CACHE_TIMEOUT_SECONDS = 60 * 60;

export function initMVTRoutes({
  router,
  logger,
  core,
}: {
  router: IRouter<DataRequestHandlerContext>;
  logger: Logger;
  core: CoreStart;
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

      const abortController = makeAbortController(request);

      const { stream, headers } = await getEsTile({
        url: `${API_ROOT_PATH}/${MVT_GETTILE_API_PATH}/{z}/{x}/{y}.pbf`,
        core,
        logger,
        context,
        geometryFieldName: query.geometryFieldName as string,
        x: parseInt((params as any).x, 10) as number,
        y: parseInt((params as any).y, 10) as number,
        z: parseInt((params as any).z, 10) as number,
        index: query.index as string,
        requestBody: decodeMvtResponseBody(query.requestBody as string) as any,
        abortController,
      });

      return sendResponse(response, stream, headers);
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
          token: schema.maybe(schema.string()),
          gridPrecision: schema.number(),
        }),
      },
    },
    async (
      context: DataRequestHandlerContext,
      request: KibanaRequest<unknown, Record<string, any>, unknown>,
      response: KibanaResponseFactory
    ) => {
      const { query, params } = request;

      const abortController = makeAbortController(request);

      const { stream, headers } = await getEsGridTile({
        url: `${API_ROOT_PATH}/${MVT_GETGRIDTILE_API_PATH}/{z}/{x}/{y}.pbf`,
        core,
        logger,
        context,
        geometryFieldName: query.geometryFieldName as string,
        x: parseInt((params as any).x, 10) as number,
        y: parseInt((params as any).y, 10) as number,
        z: parseInt((params as any).z, 10) as number,
        index: query.index as string,
        requestBody: decodeMvtResponseBody(query.requestBody as string) as any,
        requestType: query.requestType as RENDER_AS.POINT | RENDER_AS.GRID,
        gridPrecision: parseInt(query.gridPrecision, 10),
        abortController,
      });

      return sendResponse(response, stream, headers);
    }
  );
}

function sendResponse(
  response: KibanaResponseFactory,
  gzipTileStream: Stream | null,
  headers?: IncomingHttpHeaders
) {
  const cacheControl = `public, max-age=${CACHE_TIMEOUT_SECONDS}`;
  const lastModified = `${new Date().toUTCString()}`;
  if (gzipTileStream && headers) {
    // use the content-encoding and content-length headers from elasticsearch if they exist
    const { 'content-length': contentLength, 'content-encoding': contentEncoding } = headers;
    return response.ok({
      body: gzipTileStream,
      headers: {
        'content-disposition': 'inline',
        ...(contentLength && { 'content-length': contentLength }),
        ...(contentEncoding && { 'content-encoding': contentEncoding }),
        'Content-Type': 'application/x-protobuf',
        'Cache-Control': cacheControl,
        'Last-Modified': lastModified,
      },
    });
  } else {
    return response.ok({
      headers: {
        'content-length': `0`,
        'content-disposition': 'inline',
        'Content-Type': 'application/x-protobuf',
        'Cache-Control': cacheControl,
        'Last-Modified': lastModified,
      },
    });
  }
}

function makeAbortController(
  request: KibanaRequest<unknown, Record<string, any>, unknown>
): AbortController {
  const abortController = new AbortController();
  request.events.aborted$.subscribe(() => {
    abortController.abort();
  });
  return abortController;
}
