/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { estypes } from '@elastic/elasticsearch';
import { extractFieldValue, checkDefaultNamespace, checkDefaultPeriod } from '../lib/utils';
import { defineQueryForAllPodsMemoryUtilisation, calulcatePodsMemoryUtilisation } from '../lib/pods_memory_utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  DEPLOYMENT_MEMORY_ROUTE,
} from '../../common/constants';
const resource = "Deployment"
const type = "memory"
export const registerDeploymentsMemoryRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DEPLOYMENT_MEMORY_ROUTE,
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
        var deployNames = new Array();
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        if (request.query.name === undefined){
          const dslDeploys: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            _source: false,
            fields: [
            'resource.attributes.k8s.deployment.name',
            ],
            query: {
              bool: {
                must:[{ exists: { field: 'resource.attributes.k8s.deployment.name' } }]
              },
            },
            aggs: {
                unique_values: {
                    terms: { field: 'resource.attributes.k8s.deployment.name', size: 500 },
                },
            },
          };
          const deployEsResponse = await client.search(dslDeploys);
          const { after_key: _, buckets = [] } = (deployEsResponse.aggregations?.unique_values || {}) as any;
          if (buckets.length > 0) {
            buckets.map((bucket: any) => {
              const deployName = bucket.key;
              deployNames.push(deployName);
            });
          }
          console.log(deployNames);
        
        } else if (request.query.name !== undefined) {
          deployNames.push(request.query.name)
        }
        for (const name of deployNames) {
          const mustsPods = [
            {
              term: {
                'resource.attributes.k8s.deployment.name': name,
              },
            },
            {
              term: {
                'resource.attributes.k8s.namespace.name': namespace,
              },
            },
            { exists: { field: 'metrics.k8s.pod.phase' } }
          ];
          const dslPods: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            sort: [{ '@timestamp': 'desc' }],
            _source: false,
            fields: [
              '@timestamp',
              'resource.attributes.k8s.*',
            ],
            query: {
              bool: {
                must: mustsPods,
              },
            },
            aggs: {
              unique_values: {
                terms: { field: 'resource.attributes.k8s.pod.name' },
              },
            },
          };
          // console.log(mustsPods);
          // console.log(dslPods);
          const esResponsePods = await client.search(dslPods);
          //console.log(esResponsePods);
          if (esResponsePods.hits.hits.length > 0) {
            var pod_reasons = new Array();
            var pod_metrics = new Array();
            var pods_memory_medium = new Array();
            var pods_memory_high = new Array();
            var pods_deviation_high = new Array();
            var reasons = '';
            var deviation_alarm = '';
            var memory = '';

            const hitsPods = esResponsePods.hits.hits[0];
            const { fields = {} } = hitsPods
            const hitsPodsAggs = esResponsePods.aggregations.unique_values["buckets"];
            //console.log("hitspods:"+hitsPodsAggs);
            var time = extractFieldValue(fields['@timestamp']);
            for (var entries of hitsPodsAggs) {
              const podName = entries.key;

              const dslPodsMemory = defineQueryForAllPodsMemoryUtilisation(podName, namespace, client, period)
              //console.log(dslPodsMemory);
              const esResponsePods = await client.search(dslPodsMemory);
              const [pod] = calulcatePodsMemoryUtilisation(podName, namespace, esResponsePods)
              pod_reasons.push(pod.reason);
              pod_metrics.push(pod);
            }
            //Create overall message for deployment
            for (var pod_reason of pod_reasons) {
              console.table(pod_reason);
              //Check for memory pod_reason.reason[0]
              if (pod_reason.memory == "Medium") {
                pods_memory_medium.push(pod_reason.pod);
              } else if (pod_reason.memory == "High") {
                pods_memory_high.push(pod_reason.pod);
              }

              //Check for memory_usage_median_absolute_deviation pod_reason.reason[1]
              if (pod_reason.memory_usage_median_absolute_deviation == "High") {
                pods_deviation_high.push(pod_reason.pod);
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

            //End of Create overall message for deployment

            return response.ok({
              body: {
                time: time,
                name: request.query.name,
                namespace: namespace,
                pods: pod_metrics,
                alarm: memory,
                message: {
                  usage: memory,
                  deviation: deviation_alarm
                },
                reason: reasons,
              },
            });
          } else {
            const message = `Deployment ${namespace}/${request.query.name} not found`
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
      }
    );
};
