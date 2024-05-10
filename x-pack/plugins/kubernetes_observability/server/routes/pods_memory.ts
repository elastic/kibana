/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import type { ElasticsearchClient } from '@kbn/core/server';
import { defineQueryForAllPodsMemoryUtilisation, calulcateAllPodsMemoryUtilisation } from '../lib/pods_memory_utils';

import { extractFieldValue, checkDefaultNamespace } from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  POD_MEMORY_ROUTE,
} from '../../common/constants';


export const registerPodsMemoryRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: POD_MEMORY_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              name: schema.string(),
              namespace: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        var namespace = checkDefaultNamespace(request.query.namespace);

        const client = (await context.core).elasticsearch.client.asCurrentUser;
       //const dsl = defineQueryForPodsMemoryUtilisation(request.query.name, namespace, client)
        //const esResponse = await client.search(dsl);
        const dslAll = defineQueryForAllPodsMemoryUtilisation(request.query.name, namespace, client)
        const esResponseAll = await client.search(dslAll);
        console.log(dslAll);
        console.log(esResponseAll.hits.hits);
        console.log(esResponseAll.hits.hits.length);
        //console.log(esResponse);
        var message = undefined;
        var reason = undefined;
        var memory_available = undefined;
        var memory_usage = undefined;
        var memory_utilization = undefined
        var memory_usage_median = undefined
        if (esResponseAll.hits.hits.length > 0) {
          const hits = esResponseAll.hits.hits[0];
          const { fields = {} } = hits;
          const time = extractFieldValue(fields['@timestamp']);
          
          [reason, message, memory_available, memory_usage, memory_utilization, memory_usage_median ] = calulcateAllPodsMemoryUtilisation(request.query.name, namespace, esResponseAll)
          return response.ok({
            body: {
              time: time,
              message: message,
              name: request.query.name,
              namespace: namespace,
              memory_utilization: memory_utilization,
              memory_usage_median: memory_usage_median,
              memory_available: memory_available,
              memory_usage: memory_usage,
              reason: reason,
            },
          });
        } else {
          const message = `Pod ${namespace}/${request.query.name} not found`
          return response.ok({
            body: {
              time: '',
              message: message,
              name: request.query.name,
              namespace: namespace,
              reason: "Not found",
            },
          });
        }
      }
    );
};
