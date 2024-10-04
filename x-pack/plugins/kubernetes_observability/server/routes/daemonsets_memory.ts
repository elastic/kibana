/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { estypes } from '@elastic/elasticsearch';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import type { ElasticsearchClient } from '@kbn/core/server';
import { checkDefaultPeriod } from '../lib/utils';
import { getPodsMemory } from '../lib/pods_memory_utils';

import { IRouter, Logger } from '@kbn/core/server';
import {
  DAEMONSET_MEMORY_ROUTE,
} from '../../common/constants';

const resource = "Daemonset"
const type = "memory"
export const registerDaemonsetsMemoryRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DAEMONSET_MEMORY_ROUTE,
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
        var period = checkDefaultPeriod(request.query.period);
        var daemonNames = new Array();
        var daemonsets = new Array();
        var musts = new Array();
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        if (request.query.namespace !== undefined) {
          musts.push(
            {
              term: {
                'resource.attributes.k8s.namespace.name': request.query.namespace,
              },
            }
          )
        }
        if (request.query.name === undefined) {
          musts.push(
            {
              exists: {
                field: 'resource.attributes.k8s.daemonset.name'
              },
            }
          )
          const filter = [
            {
                range: {
                    "@timestamp": {
                        "gte": period
                    }
                }
            }
          ]
          const dslDaemons: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            _source: false,
            fields: [
              'resource.attributes.k8s.daemonset.name',
            ],
            query: {
              bool: {
                must: musts,
                filter: filter
              },
            },
            aggs: {
              unique_values: {
                terms: { field: 'resource.attributes.k8s.daemonset.name', size: 500 },
              },
            },
          };
          const deployEsResponse = await client.search(dslDaemons);
          const { after_key: _, buckets = [] } = (deployEsResponse.aggregations?.unique_values || {}) as any;
          if (buckets.length > 0) {
            buckets.map((bucket: any) => {
              const daemonName = bucket.key;
              daemonNames.push(daemonName);
            });
          }
          console.log(daemonNames);

        } else if (request.query.name !== undefined) {
          daemonNames.push(request.query.name)
        }

        var time = '';
        for (const daemonsetName of daemonNames) {
          const daemonPods = await getDaemonPodsasList(client, daemonsetName, request.query.namespace)
          var podObjects = new Array();
          for (const podName of daemonPods){
            const podObject = await getPodsMemory(client, period, podName, request.query.namespace, undefined, undefined);
            if (podObject !== null) {
              time = podObject.time;
              const pod = podObject.pods[0];
              podObjects.push(pod)
            }
          }
          // const podObjects = await getPodsMemory(client, period, undefined, request.query.namespace, undefined, daemonsetName);
          console.log("POD OBJECTS");
          console.log(podObjects);
          var reasons = '';
          var memory = '';
          var deviation_alarm = '';
          var namespace = request.query.namespace;
          if (podObjects.length !== 0) {
            //Create overall message for deployment
            var pods_memory_medium = new Array();
            var pods_memory_high = new Array();
            var pods_deviation_high = new Array();
            namespace = podObjects[0].namespace;
            for (const podObject of podObjects) {
              if (podObject.alarm == "Medium") {
                pods_memory_medium.push(podObject.name);
              } else if (podObject.alarm == "High") {
                pods_memory_high.push(podObject.name);
              }
              if (podObject.deviation_alarm == "High") {
                pods_deviation_high.push(podObject.name);
              }
            }

            if (pods_memory_high.length > 0) {
              reasons = reasons + `${resource} has High ${type} utilisation in following Pods:` + pods_memory_high.join(" , ");
              memory = "High";
            } else if (pods_memory_medium.length > 0) {
              reasons = reasons + `${resource} has Medium ${type} utilisation in following Pods:` + pods_memory_medium.join(" , ");
              memory = "Medium";
            } else {
              reasons = `${resource} has Low ${type} utilisation in all Pods`;
              memory = "Low";
            }

            if (pods_deviation_high.length > 0) {
              reasons = reasons + ` , ` + `${resource} has High deviation in following Pods:` + pods_deviation_high.join(" , ");
              deviation_alarm = "High";
            } else {
              deviation_alarm = "Low"
            }

            const daemonset = {
              'name': daemonsetName,
              'pods': podObjects,
              'namespace': namespace,
              'alarm': memory, 
              'message': `${resource} has ${memory} memory usage  and ${deviation_alarm} deviation from median value`,
              'reason': reasons,
            };

            daemonsets.push(daemonset)
          } else {
              if (request.query.name !== undefined) {
                const message = `${resource} ${daemonsetName} has no pods or it does not exist`
                return response.ok({
                  body: {
                    time: time,
                    message: message,
                    name: request.query.name,
                    namespace: request.query.namespace,
                    reason: "Not found or has no pods",
                    daemonsets: [],
                  },
                });
              }
          }
        }
        return response.ok({
          body: {
            time: time,
            daemonsets: daemonsets
          },
        });
      }
    );
};

export async function getDaemonPodsasList(client: any, daemonName: string, namespace?: string, ){
  var pods = new Array();
  var musts = new Array();
  musts.push(
    {
      term: {
        'resource.attributes.k8s.daemonset.name': daemonName,
      },
    },
    { exists: { field: 'metrics.k8s.pod.phase' } }
  )

  if (namespace !== undefined) {
    musts.push(
      {
        term: {
          'resource.attributes.k8s.namespace.name': namespace,
        },
      }
    )
  }

  const dslPods: estypes.SearchRequest = {
    index: ["metrics-otel.*"],
    size: 0,
    sort: [{ '@timestamp': 'desc' }],
    _source: false,
    fields: [
      '@timestamp',
      'metrics.k8s.pod.phase',
      'resource.attributes.k8s.*',
    ],
    query: {
      bool: {
        must: musts,
      },
    },
    aggs: {
      unique_values: {
        terms: { field: 'resource.attributes.k8s.pod.name', size: 500 },
      },
    },
  };
  const esResponsePods = await client.search(dslPods);
  const { after_key: _, buckets = [] } = (esResponsePods.aggregations?.unique_values || {}) as any;
  if (buckets.length > 0) {
    for (const bucket of buckets) {
      pods.push(bucket.key)
    }
  }
  return pods;
}
