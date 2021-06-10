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

export const createJourneyScreenshotBlocksRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'POST',
  path: '/api/uptime/journey/screenshot/block',
  validate: {
    body: schema.object({
      hashes: schema.arrayOf(schema.string()),
    }),
    query: schema.object({
      _inspect: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ request, response, uptimeEsClient }) => {
    const { hashes } = request.body;

    const decoded = t.array(t.string).decode(hashes);
    if (!isRight(decoded)) {
      return response.badRequest();
    }
    const { right: data } = decoded;
    const result = await libs.requests.getJourneyScreenshotBlocks({
      blockIds: data,
      uptimeEsClient,
    });
    if (result.length === 0) {
      return response.notFound();
    }
    return response.ok({
      body: result,
      headers: {
        'Cache-Control': 'max-age=604800',
      },
    });
  },
});

export const createJourneyScreenshotBlockRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/journey/screenshot/block/{hash}',
  validate: {
    params: schema.object({
      hash: schema.string(),
    }),
    query: schema.object({
      _inspect: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ request, response, uptimeEsClient }) => {
    const { hash } = request.params;

    const decoded = t.union([t.string, t.array(t.string)]).decode(hash);
    if (!isRight(decoded)) {
      return response.badRequest();
    }
    const { right: data } = decoded;
    const result = await libs.requests.getJourneyScreenshotBlocks({
      blockIds: Array.isArray(data) ? data : [data],
      uptimeEsClient,
    });
    if (result.length === 0) {
      return response.notFound();
    }
    return response.ok({
      body: result[0],
      headers: {
        'Cache-Control': 'max-age=604800',
      },
    });
  },
});
