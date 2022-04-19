/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Logger } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { IncomingHttpHeaders } from 'http';
import { Stream } from 'stream';
import { isAbortError } from './util';
import { makeExecutionContext } from '../../common/execution_context';
import { Field, mergeFields } from './merge_fields';

export async function getEsTile({
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
  abortController: AbortController;
}): Promise<{ stream: Stream | null; headers: IncomingHttpHeaders; statusCode: number }> {
  try {
    const path = `/${encodeURIComponent(index)}/_mvt/${geometryFieldName}/${z}/${x}/${y}`;

    const body = {
      grid_precision: 0, // no aggs
      exact_bounds: true,
      extent: 4096, // full resolution,
      query: requestBody.query,
      fields: mergeFields(
        [
          requestBody.docvalue_fields as Field[] | undefined,
          requestBody.stored_fields as Field[] | undefined,
        ],
        [geometryFieldName]
      ),
      runtime_mappings: requestBody.runtime_mappings,
      track_total_hits: requestBody.size + 1,
    };

    const tile = await core.executionContext.withContext(
      makeExecutionContext({
        description: 'mvt:get_tile',
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
