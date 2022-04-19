/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Logger } from 'src/core/server';
import type { DataRequestHandlerContext } from 'src/plugins/data/server';
import { IncomingHttpHeaders } from 'http';
import { Stream } from 'stream';
import { RENDER_AS } from '../../common/constants';
import { isAbortError } from './util';
import { makeExecutionContext } from '../../common/execution_context';

export async function getEsGridTile({
  url,
  core,
  logger,
  context,
  index,
  geometryFieldName,
  x,
  y,
  z,
  requestBody = {},
  renderAs = RENDER_AS.POINT,
  gridPrecision,
  abortController,
}: {
  url: string;
  core: CoreStart;
  x: number;
  y: number;
  z: number;
  geometryFieldName: string;
  index: string;
  context: DataRequestHandlerContext;
  logger: Logger;
  requestBody: any;
  renderAs: RENDER_AS;
  gridPrecision: number;
  abortController: AbortController;
}): Promise<{ stream: Stream | null; headers: IncomingHttpHeaders; statusCode: number }> {
  try {
    const path = `/${encodeURIComponent(index)}/_mvt/${geometryFieldName}/${z}/${x}/${y}`;
    const body = {
      size: 0, // no hits
      grid_precision: gridPrecision,
      exact_bounds: false,
      extent: 4096, // full resolution,
      query: requestBody.query,
      grid_agg: renderAs === RENDER_AS.HEX ? 'geohex' : 'geotile',
      grid_type: renderAs === RENDER_AS.GRID || renderAs === RENDER_AS.HEX ? 'grid' : 'centroid',
      aggs: requestBody.aggs,
      fields: requestBody.fields,
      runtime_mappings: requestBody.runtime_mappings,
    };

    const tile = await core.executionContext.withContext(
      makeExecutionContext({
        description: 'mvt:get_grid_tile',
        url,
      }),
      async () => {
        return await context.core.elasticsearch.client.asCurrentUser.transport.request(
          {
            method: 'GET',
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
      }
    );

    return { stream: tile.body as Stream, headers: tile.headers, statusCode: tile.statusCode };
  } catch (e) {
    if (isAbortError(e)) {
      return { stream: null, headers: {}, statusCode: 200 };
    }

    // These are often circuit breaking exceptions
    // Should return a tile with some error message
    logger.warn(`Cannot generate ES-grid-tile for ${z}/${x}/${y}: ${e.message}`);
    return { stream: null, headers: {}, statusCode: 500 };
  }
}
