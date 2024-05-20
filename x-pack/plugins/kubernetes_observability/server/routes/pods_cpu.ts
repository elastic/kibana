/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { extractFieldValue, checkDefaultNamespace, checkDefaultPeriod, NodeCpu, Limits, toPct } from '../lib/utils';
import { calulcatePodsCpuUtilisation, defineQueryForAllPodsCpuUtilisation, defineQueryGeneralCpuUtilisation2 } from '../lib/pods_cpu_utils';

import { IRouter, Logger } from '@kbn/core/server';
import {
  POD_CPU_ROUTE,
} from '../../common/constants';

const limits: Limits = {
  medium: 0.7,
  high: 0.9,
};

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
          const dsl = defineQueryGeneralCpuUtilisation2(namespace, client, period);
          try {
            const esResponse = await client.search(dsl);
            if (esResponse.hits.hits.length > 0) {
              const firsttHit = esResponse.hits.hits[0];
              const { fields = {} } = firsttHit;
              var time = extractFieldValue(fields['@timestamp']);
              const { after_key: _, buckets = [] } = (esResponse.aggregations?.group_by_category || {}) as any;
              if (buckets.length > 0) {
                var pods = new Array();
                const getPods = buckets.map(async (bucket: any) => {
                  const name = bucket.key;
                  console.log("Each bucket" + name);
                  var nodeMem = {} as NodeCpu;
                  var alarm = '';
                  console.log(bucket)
                
                  var cpu_utilisation = bucket.stats_cpu_utilization.avg;
                  var cpu_utilisation_median_deviation = bucket.review_variability_cpu_utilization.value;      
                  var reason = undefined;
                  var message = undefined;

                    if (cpu_utilisation < limits["medium"]) {
                      alarm = "Low";
                    } else if (cpu_utilisation >= limits["medium"] && cpu_utilisation < limits["high"]) {
                      alarm = "Medium";
                    } else {
                      alarm = "High";
                    }

                    reason = `Pod ${name} has ${alarm} memory utilization`
                    message = `Pod ${name} has  ${toPct(cpu_utilisation)}% memory_utilisation and ${cpu_utilisation_median_deviation} bytes deviation from median value.`

                  nodeMem = {
                    'name': name,
                    'cpu_utilization': cpu_utilisation,
                    'cpu_utilization_median_deviation': cpu_utilisation_median_deviation,
                    'alarm': alarm,
                    'message': message,
                    'reason': reason
                  };
                  pods.push(nodeMem);
                });
                return Promise.all(getPods).then(() => {
                  return response.ok({
                    body: {
                      time: time,
                      pods: pods,
                    },
                  });
                });
              }

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
