/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import type { ElasticsearchClient } from '@kbn/core/server';
import { extractFieldValue, checkDefaultNamespace } from '../lib/utils';
import { calulcateAllPodsCpuUtilisation, defineQueryForAllPodsCpuUtilisation } from '../lib/pods_cpu_utils';

import { IRouter, Logger } from '@kbn/core/server';
import {
  POD_CPU_ROUTE,
} from '../../common/constants';

export const registerPodsCpuRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: POD_CPU_ROUTE,
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
        const dsl = defineQueryForAllPodsCpuUtilisation(request.query.name, namespace, client);
        console.log(dsl);
        const esResponse = await client.search(dsl);
        var message = undefined;
        var reason = undefined;
        var cpu_utilization = undefined;
        var cpu_utilization_median = undefined;
        console.log(esResponse);
        if (esResponse.hits.hits.length > 0) {
          const hit = esResponse.hits.hits[0];
          const { fields = {} } = hit;
          const time = extractFieldValue(fields['@timestamp']);

          [reason, message, cpu_utilization, cpu_utilization_median] = calulcateAllPodsCpuUtilisation(request.query.name, namespace, esResponse)

          return response.ok({
            body: {
              time: time,
              name: request.query.name,
              namespace: namespace,
              cpu_utilization: cpu_utilization,
              cpu_utilization_median: cpu_utilization_median,
              message: message,
              reason: reason
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
