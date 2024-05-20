/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { extractFieldValue, checkDefaultNamespace, checkDefaultPeriod } from '../lib/utils';
import { calulcatePodsCpuUtilisation, defineQueryForAllPodsCpuUtilisation, defineQueryGeneralCpuUtilisation } from '../lib/pods_cpu_utils';

import { IRouter, Logger } from '@kbn/core/server';
import {
  POD_CPU_ROUTE,
} from '../../common/constants';
import { Exception } from '@opentelemetry/api/build/src/common/Exception';

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
              name: schema.maybe(schema.string()),
              namespace: schema.maybe(schema.string()),
              period: schema.maybe(schema.string())
            }),
          },
        },
      },
      async (context, request, response) => {
        var namespace = checkDefaultNamespace(request.query.namespace);
        var period = checkDefaultPeriod(request.query.period);
        const client = (await context.core).elasticsearch.client.asCurrentUser

        if (request.query.name !== undefined) { // Flow when user provides pod name
          const dsl = defineQueryForAllPodsCpuUtilisation(request.query.name, namespace, client, period);
          try {
            const esResponse = await client.search(dsl);
            console.log(esResponse);
            var message = undefined;

            if (esResponse.hits.hits.length > 0) {
              const hit = esResponse.hits.hits[0];
              const { fields = {} } = hit;
              const time = extractFieldValue(fields['@timestamp']);

              const [pod] = calulcatePodsCpuUtilisation(request.query.name, namespace, esResponse)

              return response.ok({
                body: {
                  time: time,
                  pod,
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
          } catch (e) { //catch error for request parameters provided
            console.log(e)
            return response.customError({ statusCode: 500, body: e});
          }
        } else { // Empty Pod name is provided
          const dsl = defineQueryGeneralCpuUtilisation(namespace, client, period);
          try {
            const esResponse = await client.search(dsl);
            if (esResponse.hits.hits.length > 0) {
              var pod_metrics = new Array();

              const hitsPods = esResponse.hits.hits[0];
              const { fields = {} } = hitsPods
              const hitsPodsAggs = esResponse.aggregations.group_by_category["buckets"];
              var time = extractFieldValue(fields['@timestamp']);
              for (var entries of hitsPodsAggs) {
                const metrics = entries.tm.top[0]["metrics"];
                const cpu_utilization = metrics['k8s.pod.cpu.utilization'];
                const pod_name = metrics['resource.attributes.k8s.pod.name'];
                const pod = { pod_name, cpu_utilization };
                pod_metrics.push(pod);

              }
              return response.ok({
                body: {
                  time: time,
                  namespace: namespace,
                  message: "Pods with Highest Cpu",
                  pods: pod_metrics,
                },
              });

            } else {
              const message = `No metrics returned for ${namespace}`
              return response.ok({
                body: {
                  time: '',
                  message: message,
                  namespace: namespace,
                  reason: "Not found",
                },
              });
            }
          }
          catch (e) { //catch error for request parameters provided
            console.log(e)
            return response.customError({ statusCode: 500, body: e});
          }
        }
      }
    );
};
