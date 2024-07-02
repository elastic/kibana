/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { estypes } from '@elastic/elasticsearch';
import { checkDefaultPeriod } from '../lib/utils';
import { getPodsMemory } from '../lib/pods_memory_utils';
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
          const filter = [
            {
                range: {
                    "@timestamp": {
                        "gte": period
                    }
                }
            }
          ]
          const dslDeploys: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            _source: false,
            fields: [
              'resource.attributes.k8s.deployment.name',
            ],
            query: {
              bool: {
                must: musts,
                filter: filter
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
        var time = '';
        for (const deploy of deployNames) {
          const podObjects = await getPodsMemory(client, period, undefined, request.query.namespace, deploy, undefined);
          console.log("POD OBJECTS");
          console.log(podObjects);
          var reasons = '';
          var memory = '';
          var deviation_alarm = '';
          var namespace = request.query.namespace;
          if (podObjects !== null) {
            //Create overall message for deployment
            var pods_memory_medium = new Array();
            var pods_memory_high = new Array();
            var pods_deviation_high = new Array();
            time = podObjects.time;
            namespace = podObjects.pods[0].namespace;
            for (const podObject of podObjects.pods) {
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

            const deployment = {
              'name': deploy,
              'pods': podObjects.pods,
              'alarm': memory, 
              'namespace': namespace,
              'message': `Deployment has ${memory} memory usage  and ${deviation_alarm} deviation from median value`,
              'reason': reasons,
            };

            deployments.push(deployment)
          } else {
              if (request.query.name !== undefined) {
                const message = `Deployment ${deploy} has no pods or it does not exist`
                return response.ok({
                    body: {
                      time: time,
                      message: message,
                      name: request.query.name,
                      namespace: request.query.namespace,
                      reason: "Not found or has no pods",
                      deployments: [],
                    },
                  });
              }
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
