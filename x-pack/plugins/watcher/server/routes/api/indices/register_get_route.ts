/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { reduce, size } from 'lodash';
import { isEsError } from '../../../shared_imports';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

const bodySchema = schema.object({ pattern: schema.string() }, { unknowns: 'allow' });

function getIndexNamesFromAliasesResponse(json: Record<string, any>) {
  return reduce(
    json,
    (list, { aliases }, indexName) => {
      list.push(indexName);
      if (size(aliases) > 0) {
        list.push(...Object.keys(aliases));
      }
      return list;
    },
    [] as string[]
  );
}

function getIndices(dataClient: ILegacyScopedClusterClient, pattern: string, limit = 10) {
  return dataClient
    .callAsCurrentUser('indices.getAlias', {
      index: pattern,
      ignore: [404],
    })
    .then((aliasResult: any) => {
      if (aliasResult.status !== 404) {
        const indicesFromAliasResponse = getIndexNamesFromAliasesResponse(aliasResult);
        return indicesFromAliasResponse.slice(0, limit);
      }

      const params = {
        index: pattern,
        ignore: [404],
        body: {
          size: 0, // no hits
          aggs: {
            indices: {
              terms: {
                field: '_index',
                size: limit,
              },
            },
          },
        },
      };

      return dataClient.callAsCurrentUser('search', params).then((response: any) => {
        if (response.status === 404 || !response.aggregations) {
          return [];
        }
        return response.aggregations.indices.buckets.map((bucket: any) => bucket.key);
      });
    });
}

export function registerGetRoute(deps: RouteDependencies) {
  deps.router.post(
    {
      path: '/api/watcher/indices',
      validate: {
        body: bodySchema,
      },
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      const { pattern } = request.body;

      try {
        const indices = await getIndices(ctx.watcher!.client, pattern);
        return response.ok({ body: { indices } });
      } catch (e) {
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          return response.customError({ statusCode: e.statusCode, body: e });
        }

        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
