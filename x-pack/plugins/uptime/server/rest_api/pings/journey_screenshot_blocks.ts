/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { ScreenshotBlockDoc } from '../../../common/runtime_types/ping/synthetics';

export const createJourneyScreenshotBlockRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/journey/screenshot/block',
  validate: {
    query: schema.object({
      hash: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
      _inspect: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ request, response, uptimeEsClient }) => {
    const { hash } = request.query;

    const decoded = t.union([t.string, t.array(t.string)]).decode(hash);
    if (!isRight(decoded)) {
      return response.badRequest();
    }
    const { right: data } = decoded;
    let result: ScreenshotBlockDoc[];
    try {
      result = await libs.requests.getJourneyScreenshotBlocks({
        blockIds: Array.isArray(data) ? data : [data],
        uptimeEsClient,
      });
    } catch (e: unknown) {
      return response.custom({ statusCode: 500, body: { message: e } });
    }
    if (result.length === 0) {
      return response.notFound();
    }
    return response.ok({
      body: result,
      headers: {
        // we can cache these blocks with extreme prejudice as they are inherently unchanging
        // when queried by ID, since the ID is the hash of the data
        'Cache-Control': 'max-age=604800',
      },
    });
  },
});
