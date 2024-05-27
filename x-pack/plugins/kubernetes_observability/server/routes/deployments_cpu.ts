/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { estypes } from '@elastic/elasticsearch';
import { extractFieldValue, checkDefaultNamespace, checkDefaultPeriod } from '../lib/utils';
import { calulcatePodsCpuUtilisation, defineQueryForAllPodsCpuUtilisation } from '../lib/pods_cpu_utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  DEPLOYMENT_CPU_ROUTE,
} from '../../common/constants';
const resource = "Deployment"
const type = "cpu"

export const registerDeploymentsCpuRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DEPLOYMENT_CPU_ROUTE,
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
        var deployNames = new Array();
        var deployments = new Array();
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
                field: 'resource.attributes.k8s.deployment.name'
              },
            }
          )
          const dslDeploys: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            _source: false,
            fields: [
              'resource.attributes.k8s.deployment.name',
            ],
            query: {
              bool: {
                must: musts
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
          if (esResponsePods.hits.hits.length > 0) {

            var pod_reasons = new Array();
            var pod_metrics = new Array();
            var pods_cpu_medium = new Array();
            var pods_cpu_high = new Array();
            var pods_deviation_high = new Array();
            var reasons = '';
            var cpu = '';
            var deviation_alarm = '';

            const hitsPods = esResponsePods.hits.hits[0];
            const { fields = {} } = hitsPods
            var namespace1 = extractFieldValue(fields['resource.attributes.k8s.namespace.name'])
            var time = extractFieldValue(fields['@timestamp']);
            const { after_key2: _, buckets = [] } = (esResponsePods.aggregations?.unique_values || {}) as any;
            console.log("rs1"+hitsPods);
            console.log("rs2"+buckets);
            for (var entries of buckets) {
              const podName = entries.key;
              console.log("pod"+podName);
              const dslPodsCpu = defineQueryForAllPodsCpuUtilisation(podName, namespace1, client, period);
              const esResponsePodsCpu = await client.search(dslPodsCpu);
              const [pod] = calulcatePodsCpuUtilisation(podName, namespace1, esResponsePodsCpu);
              console.table(pod);
              //For every pod we keep arrays for reason and metrics
              pod_reasons.push(pod.reason);
              pod_metrics.push(pod);
            }
            //Create overall message for deployment
            for (var pod_reason of pod_reasons) {
              //Check for cpu utlisation in pod_reason.reason[0]
              if (pod_reason.reason == "Medium") {
                pods_cpu_medium.push(pod_reason.pod);
              } else if (pod_reason.reason == "High") {
                pods_cpu_high.push(pod_reason.pod);
              }

              //Check for cpu_utilization_median_absolute_deviation pod_reason.reason[1]
              if (pod_reason.cpu_utilisation_median_absolute_deviation == "High") {
                pods_deviation_high.push(pod_reason.pod);
              }
            }

            if (pods_cpu_high.length > 0) {
              reasons = reasons + `${resource} has High ${type} utilisation in following Pods:` + pods_cpu_high.join(" , ");
              cpu = "High";
            } else if (pods_cpu_medium.length > 0) {
              reasons = reasons + `${resource} has Medium ${type} utilisation in following Pods:` + pods_cpu_medium.join(" , ");
              cpu = "Medium";
            } else {
              reasons = `${resource} has Low ${type} utilisation in all Pods`;
              cpu = "Low";
            }

            if (pods_deviation_high.length > 0) {
              reasons = reasons + ` , ` + `${resource} has High deviation in following Pods:` + pods_deviation_high.join(" , ");
              deviation_alarm = "High";
            } else { deviation_alarm = "Low" }

            //End of Create overall message for deployment
            var deployments_single = {
              'name': name,
              'pods': pod_metrics,
              'message': `Deployment has cpu utilization ${cpu} and deviation ${deviation_alarm}`,
              'reason': reasons,
            };
            deployments.push(deployments_single);
          } else {
            const message = `Deployment ${name} not found`
            deployments_single = {
              'name': name,
              'pods': [],
              'message': message,
              'reason': "Not found",
            }
            deployments.push(deployments_single)
          }
        }
        return response.ok({
          body: {
            time: time,
            deployments: deployments
          },
        });
      }
    );
};