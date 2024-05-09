/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import type { ElasticsearchClient } from '@kbn/core/server';
import { defineQueryForPodsMemoryUtilisation, calulcatePodsMemoryUtilisation } from '../lib/pods_memory_utils';

import { extractFieldValue, round } from '../lib/utils';
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
              pod_name: schema.string(),
              namespace: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const dsl = defineQueryForPodsMemoryUtilisation(request.query.pod_name, request.query.namespace, client)
        const esResponse = await client.search(dsl);
        console.log(esResponse);
        var message = {};
        var reason = {};
        var memory_available= undefined;
        var memory_usage= undefined;
        var memory_utilization =undefined
        if (esResponse.hits.hits.length > 0) {
        const hits = esResponse.hits.hits[0];
        const { fields = {} } = hits;
        const time = extractFieldValue(fields['@timestamp']);

        [reason, message, memory_available, memory_usage, memory_utilization] = calulcatePodsMemoryUtilisation(request.query.pod_name, request.query.namespace, esResponse)
          return response.ok({
            body: {
              time: time,
              message: message,
              name: request.query.pod_name,
              namespace: request.query.namespace,
              memory_utilization: memory_utilization,
              memory_available: memory_available,
              memory_usage: memory_usage,
              reason: reason,
            },
          });
        } else {
          const message = `Pod ${request.query.namespace}/${request.query.pod_name} not found`
          return response.ok({
            body: {
              time: '',
              message: message,
              name: request.query.pod_name,
              namespace: request.query.namespace,
              reason: "Not found",
            },
          });
        }
      }
    );
};
