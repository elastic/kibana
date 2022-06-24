/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stream } from 'stream';
import { IncomingHttpHeaders } from 'http';
import { schema } from '@kbn/config-schema';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { CoreStart, KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { errors } from '@elastic/elasticsearch';
import {
  MVT_GETTILE_API_PATH,
  API_ROOT_PATH,
  MVT_GETGRIDTILE_API_PATH,
  RENDER_AS,
} from '../../common/constants';
import { makeExecutionContext } from '../../common/execution_context';
import { getAggsTileRequest, getHitsTileRequest } from '../../common/mvt_request_body';

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
          hasLabels: schema.boolean(),
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
      const x = parseInt((params as any).x, 10) as number;
      const y = parseInt((params as any).y, 10) as number;
      const z = parseInt((params as any).z, 10) as number;

      let tileRequest: { path: string; body: object } | undefined;
      try {
        tileRequest = getHitsTileRequest({
          encodedRequestBody: query.requestBody as string,
          geometryFieldName: query.geometryFieldName as string,
          hasLabels: query.hasLabels as boolean,
          index: query.index as string,
          x,
          y,
          z,
        });
      } catch (e) {
        return response.badRequest();
      }

      const { stream, headers, statusCode } = await getTile({
        abortController: makeAbortController(request),
        body: tileRequest.body,
        context,
        core,
        executionContext: makeExecutionContext({
          description: 'mvt:get_hits_tile',
          url: `${API_ROOT_PATH}/${MVT_GETTILE_API_PATH}/${z}/${x}/${y}.pbf`,
        }),
        logger,
        path: tileRequest.path,
      });

      return sendResponse(response, stream, headers, statusCode);
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
          hasLabels: schema.boolean(),
          requestBody: schema.string(),
          index: schema.string(),
          renderAs: schema.string(),
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
      const x = parseInt((params as any).x, 10) as number;
      const y = parseInt((params as any).y, 10) as number;
      const z = parseInt((params as any).z, 10) as number;

      let tileRequest: { path: string; body: object } | undefined;
      try {
        tileRequest = getAggsTileRequest({
          encodedRequestBody: query.requestBody as string,
          geometryFieldName: query.geometryFieldName as string,
          gridPrecision: parseInt(query.gridPrecision, 10),
          hasLabels: query.hasLabels as boolean,
          index: query.index as string,
          renderAs: query.renderAs as RENDER_AS,
          x,
          y,
          z,
        });
      } catch (e) {
        return response.badRequest();
      }

      const { stream, headers, statusCode } = await getTile({
        abortController: makeAbortController(request),
        body: tileRequest.body,
        context,
        core,
        executionContext: makeExecutionContext({
          description: 'mvt:get_aggs_tile',
          url: `${API_ROOT_PATH}/${MVT_GETGRIDTILE_API_PATH}/${z}/${x}/${y}.pbf`,
        }),
        logger,
        path: tileRequest.path,
      });

      return sendResponse(response, stream, headers, statusCode);
    }
  );
}

async function getTile({
  abortController,
  body,
  context,
  core,
  executionContext,
  logger,
  path,
}: {
  abortController: AbortController;
  body: object;
  context: DataRequestHandlerContext;
  core: CoreStart;
  executionContext: KibanaExecutionContext;
  logger: Logger;
  path: string;
}) {
  try {
    const esClient = (await context.core).elasticsearch.client;
    const tile = await core.executionContext.withContext(executionContext, async () => {
      return await esClient.asCurrentUser.transport.request(
        {
          method: 'POST',
          path,
          body,
        },
        {
          signal: abortController.signal,
          headers: {
            'Accept-Encoding': 'gzip',
          },
          asStream: true,
          meta: true,
        }
      );
    });

    return { stream: tile.body as Stream, headers: tile.headers, statusCode: tile.statusCode };
  } catch (e) {
    if (e instanceof errors.RequestAbortedError) {
      return { stream: null, headers: {}, statusCode: 200 };
    }

    // These are often circuit breaking exceptions
    // Should return a tile with some error message
    logger.warn(`Cannot generate tile for ${executionContext.url}: ${e.message}`);
    return { stream: null, headers: {}, statusCode: 500 };
  }
}

export function sendResponse(
  response: KibanaResponseFactory,
  tileStream: Stream | null,
  headers: IncomingHttpHeaders,
  statusCode: number
) {
  if (statusCode >= 400) {
    return response.customError({
      statusCode,
      body: tileStream ? tileStream : statusCode.toString(),
    });
  }

  const cacheControl = `public, max-age=${CACHE_TIMEOUT_SECONDS}`;
  const lastModified = `${new Date().toUTCString()}`;
  if (tileStream) {
    // use the content-encoding and content-length headers from elasticsearch if they exist
    const { 'content-length': contentLength, 'content-encoding': contentEncoding } = headers;
    return response.ok({
      body: tileStream,
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
