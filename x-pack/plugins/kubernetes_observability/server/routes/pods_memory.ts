/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { extractFieldValue, checkDefaultNamespace, checkDefaultPeriod, NodeMem, round, Limits, toPct } from '../lib/utils';
import { defineQueryForAllPodsMemoryUtilisation, calulcatePodsMemoryUtilisation, defineQueryGeneralMemoryUtilisation2 } from '../lib/pods_memory_utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  POD_MEMORY_ROUTE,
} from '../../common/constants';

const limits: Limits = {
  medium: 0.7,
  high: 0.9,
};

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
        try {
          const client = (await context.core).elasticsearch.client.asCurrentUser;

          if (request.query.name !== undefined) { // Flow when user provides pod name
            const dslAll = defineQueryForAllPodsMemoryUtilisation(request.query.name, namespace, client, period)
            const esResponseAll = await client.search(dslAll);

            if (esResponseAll.hits.hits.length > 0) {
              const hits = esResponseAll.hits.hits[0];
              const { fields = {} } = hits;
              const time = extractFieldValue(fields['@timestamp']);

              const pod = calulcatePodsMemoryUtilisation(request.query.name, namespace, esResponseAll)
              return response.ok({
                body: {
                  time: time,
                  pod
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
          } else { // Empty Pod name is provided
            const dsl = defineQueryGeneralMemoryUtilisation2(namespace, client, period);
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
                  var nodeMem = {} as NodeMem;
                  var alarm = '';
                  console.log(bucket)
                
                  const memory_available = bucket.stats_available.avg;
                  const memory_usage = bucket.stats_memory.avg;
                  const memory_usage_median_deviation = bucket.review_variability_memory_usage.value;
                  var memory_utilization = undefined;
                  var reason = undefined;
                  var message = undefined;
                  if (memory_available != 0) {
                    memory_utilization = round(memory_usage / (memory_usage + memory_available), 3);
                    if (memory_utilization < limits["medium"]) {
                      alarm = "Low";
                    } else if (memory_utilization >= limits["medium"] && memory_utilization < limits["high"]) {
                      alarm = "Medium";
                    } else {
                      alarm = "High";
                    }

                    reason = `Pod ${name} has ${alarm} memory utilization`
                    message = `Pod ${name} has ${memory_available} bytes memory available, ${memory_usage} bytes memory usage, ${toPct(memory_utilization)}% memory_utilisation and ${memory_usage_median_deviation} bytes deviation from median value.`

                  } else {
                    reason = `Pod ${name} has ${memory_utilization} memory utilization`
                    message = `Pod ${name} has ${memory_available} bytes memory available, ${memory_usage} bytes memory usage, ${memory_utilization} memory_utilisation and ${memory_usage_median_deviation} bytes deviation from median value.`
                  }
                  nodeMem = {
                    'name': name,
                    'memory_available': memory_available,
                    'memory_usage': memory_usage,
                    'memory_utilization': memory_utilization,
                    'memory_usage_median_deviation': memory_usage_median_deviation,
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
        } catch (e) { //catch error for request parameters provided
          console.log(e)
          return response.customError({ statusCode: 500, body: e });
        }
      }
    );
};
