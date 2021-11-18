/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import type { DataRequestHandlerContext } from 'src/plugins/data/server';
// @ts-ignore not typed
import { AbortController } from 'abortcontroller-polyfill/dist/cjs-ponyfill';
import { RENDER_AS } from '../../common/constants';

function isAbortError(error: Error) {
  return error.message === 'Request aborted' || error.message === 'Aborted';
}

export async function getEsGridTile({
  logger,
  context,
  index,
  geometryFieldName,
  x,
  y,
  z,
  requestBody = {},
  requestType = RENDER_AS.POINT,
  abortController,
}: {
  x: number;
  y: number;
  z: number;
  geometryFieldName: string;
  index: string;
  context: DataRequestHandlerContext;
  logger: Logger;
  requestBody: any;
  requestType: RENDER_AS.GRID | RENDER_AS.POINT;
  abortController: AbortController;
}): Promise<Buffer | null> {
  try {
    const path = `/${encodeURIComponent(index)}/_mvt/${geometryFieldName}/${z}/${x}/${y}`;
    const body = {
      size: 0, // no hits
      grid_precision: 8,
      exact_bounds: false,
      extent: 4096, // full resolution,
      query: requestBody.query,
      grid_type: requestType === RENDER_AS.GRID ? 'grid' : 'centroid',
      aggs: requestBody.aggs,
      fields: requestBody.fields,
      runtime_mappings: requestBody.runtime_mappings,
    };
    const tile = await context.core.elasticsearch.client.asCurrentUser.transport.request(
      {
        method: 'GET',
        path,
        body,
      },
      {
        signal: abortController.signal,
      }
    );
    return tile.body as unknown as Buffer;
  } catch (e) {
    if (!isAbortError(e)) {
      // These are often circuit breaking exceptions
      // Should return a tile with some error message
      logger.warn(`Cannot generate ES-grid-tile for ${z}/${x}/${y}: ${e.message}`);
    }
    return null;
  }
}
