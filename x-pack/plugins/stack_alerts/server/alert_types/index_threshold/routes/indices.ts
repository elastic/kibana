/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// the business logic of this code is from watcher, in:
//   x-pack/plugins/watcher/server/routes/api/indices/register_get_route.ts

const MAX_INDICES = 20;

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  ILegacyScopedClusterClient,
} from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { Service } from '../../../types';

const bodySchema = schema.object({
  pattern: schema.string(),
});

type RequestBody = TypeOf<typeof bodySchema>;

export function createIndicesRoute(service: Service, router: IRouter, baseRoute: string) {
  const path = `${baseRoute}/_indices`;
  service.logger.debug(`registering indexThreshold route POST ${path}`);
  router.post(
    {
      path,
      validate: {
        body: bodySchema,
      },
    },
    handler
  );
  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, RequestBody>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    const pattern = req.body.pattern;
    service.logger.debug(`route ${path} request: ${JSON.stringify(req.body)}`);

    if (pattern.trim() === '') {
      return res.ok({ body: { indices: [] } });
    }

    let aliases: string[] = [];
    try {
      aliases = await getAliasesFromPattern(ctx.core.elasticsearch.legacy.client, pattern);
    } catch (err) {
      service.logger.warn(
        `route ${path} error getting aliases from pattern "${pattern}": ${err.message}`
      );
    }

    let indices: string[] = [];
    try {
      indices = await getIndicesFromPattern(ctx.core.elasticsearch.legacy.client, pattern);
    } catch (err) {
      service.logger.warn(
        `route ${path} error getting indices from pattern "${pattern}": ${err.message}`
      );
    }

    const result = { indices: uniqueCombined(aliases, indices, MAX_INDICES) };

    service.logger.debug(`route ${path} response: ${JSON.stringify(result)}`);
    return res.ok({ body: result });
  }
}

function uniqueCombined(list1: string[], list2: string[], limit: number) {
  const set = new Set(list1.concat(list2));
  const result = Array.from(set);
  result.sort((string1, string2) => string1.localeCompare(string2));
  return result.slice(0, limit);
}

async function getIndicesFromPattern(
  dataClient: ILegacyScopedClusterClient,
  pattern: string
): Promise<string[]> {
  const params = {
    index: pattern,
    ignore: [404],
    ignoreUnavailable: true,
    body: {
      size: 0, // no hits
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: MAX_INDICES,
          },
        },
      },
    },
  };
  const response: SearchResponse<unknown> = await dataClient.callAsCurrentUser('search', params);
  // TODO: Investigate when the status field might appear here, type suggests it shouldn't ever happen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((response as any).status === 404 || !response.aggregations) {
    return [];
  }

  return (response.aggregations as IndiciesAggregation).indices.buckets.map((bucket) => bucket.key);
}

async function getAliasesFromPattern(
  dataClient: ILegacyScopedClusterClient,
  pattern: string
): Promise<string[]> {
  const params = {
    index: pattern,
    ignoreUnavailable: true,
    ignore: [404],
  };
  const result: string[] = [];

  const response = await dataClient.callAsCurrentUser('indices.getAlias', params);

  if (response.status === 404) {
    return result;
  }

  for (const index of Object.keys(response)) {
    const aliasRecord = response[index];
    if (aliasRecord.aliases) {
      const aliases = Object.keys(aliasRecord.aliases);
      result.push(...aliases);
    }
  }

  return result;
}

interface IndiciesAggregation {
  indices: {
    buckets: Array<{ key: string }>;
  };
}
