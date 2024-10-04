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
import { extractFieldValue, phaseToState, Event, Deployment, checkDefaultPeriod } from '../lib/utils';
import { getPodEvents, getPodContainersStatus } from './pods';
import { IRouter, Logger } from '@kbn/core/server';
import {
  DEPLOYMENT_STATUS_ROUTE,
} from '../../common/constants';

export const registerDeploymentsRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DEPLOYMENT_STATUS_ROUTE,
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
        const period = checkDefaultPeriod(request.query.period);
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        var deployNames = new Array();
        if (request.query.name !== undefined) {
          deployNames.push(request.query.name);
        };
        if (request.query.name === undefined) {
          var deploymusts = new Array();
          deploymusts.push(
            { exists: { field: 'resource.attributes.k8s.deployment.name' } }
          )
          if (request.query.namespace !== undefined) {
            deploymusts.push(
                {
                    term: {
                        'resource.attributes.k8s.namespace.name': request.query.namespace,
                    },
                },
            )
          };
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
                  must: deploymusts,
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
        }


        if (deployNames.length === 0){
          const message =  `No deployments found`
          return response.ok({
              body: {
                time: '',
                message: message,
                name: request.query.name,
                namespace: request.query.namespace,
                reason: "Not found",
                deployments: [],
              },
            });
        }

        if (deployNames.length === 1) {
            const deployObject = await getDeployStatus(client, deployNames[0], period, request.query.namespace);
            if (Object.keys(deployObject).length === 0) {
              var fullName = deployNames[0];
              if (request.query.namespace !== undefined) {
                fullName = request.query.namespace + "/" + deployNames[0];
              };
              const message =  `Deployment ${fullName} not found`
              return response.ok({
                  body: {
                    time: '',
                    message: message,
                    name: deployNames[0],
                    namespace: request.query.namespace,
                    reason: "Not found",
                    deployments: [],
                  },
                });
            }
            return response.ok({
              body: {
                time: deployObject.time,
                deployments: [deployObject]
              },
            });
        }

        var deployObjects = new Array();
        for (const name of deployNames) {
           const deployObject = await getDeployStatus(client, name, period, request.query.namespace);
           deployObjects.push(deployObject);
        }
        return response.ok({
          body: {
            time: deployObjects[0].time,
            deployments: deployObjects
          },
        });
      }
    );
};

export async function getDeployStatus(client: any, deployName: string, period: string, namespace?: string): Promise<Deployment>{
  var musts = new Array();
  musts.push(
    {
      term: {
        'resource.attributes.k8s.deployment.name': deployName,
      },
    },
    { exists: { field: 'metrics.k8s.deployment.available' } }
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

  const filter = [
    {
        range: {
            "@timestamp": {
                "gte": period
            }
        }
    }
  ]

  const dsl: estypes.SearchRequest = {
    index: ["metrics-otel.*"],
    size: 1,
    sort: [{ '@timestamp': 'desc' }],
    _source: false,
    fields: [
      '@timestamp',
      'metrics.k8s.deployment.available',
      'metrics.k8s.deployment.desired',
      'resource.attributes.k8s.*',
    ],
    query: {
      bool: {
        must: musts,
        filter: filter
      },
    },
  };
  const esResponse = await client.search(dsl);
  var deploy = {} as Deployment;
  if (esResponse.hits.hits.length > 0) {
    const hit = esResponse.hits.hits[0];
    const { fields = {} } = hit;
    const replicasAvailable = extractFieldValue(fields['metrics.k8s.deployment.available']);
    const replicasdesired = extractFieldValue(fields['metrics.k8s.deployment.desired']);
    const deployNamespace =  extractFieldValue(fields['resource.attributes.k8s.namespace.name']);
    var message = '';
    var reason = '';
    const time = extractFieldValue(fields['@timestamp']);
    
    if (replicasAvailable == replicasdesired) {
      message = `Deployment ${deployNamespace}/${deployName} has as many replicas available as desired`;
      deploy = {
          time: time,
          message: message,
          replicasAvailable: replicasAvailable,
          replicasDesired: replicasdesired,
          name: deployName,
          namespace: deployNamespace,
          reason: reason,
          events: []
        }
    } else {
      console.log("replicas desired not equal to available");
      deploy = await getDeployPods(client, deployName, deployNamespace, replicasAvailable, replicasdesired, period)
      deploy.time = time;
      return deploy;
    }
  }
  return deploy;

}

export async function getDeployPods(client: any, deployName: string, namespace: string, replicasAvailable: string, replicasdesired: string, period: string): Promise<Deployment>{
  const musts = [
    {
      term: {
        'resource.attributes.k8s.deployment.name': deployName,
      },
    },
    {
      term: {
        'resource.attributes.k8s.namespace.name': namespace,
      },
    },
    { exists: { field: 'metrics.k8s.pod.phase' } }
  ];
  var size: number = +replicasdesired;
  const filter = [
    {
        range: {
            "@timestamp": {
                "gte": period
            }
        }
    }
  ]
  const dslPods: estypes.SearchRequest = {
    index: ["metrics-otel.*"],
    size: size,
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
        filter: filter
      },
    },
    aggs: {
      unique_values: {
        terms: { field: 'resource.attributes.k8s.pod.name' },
      },
    },
  };
  const esResponsePods = await client.search(dslPods);
  console.log(esResponsePods);
  const hits = esResponsePods.hits.hits;
  var notRunningPods = new Array();
  const message = `Deployment ${namespace}/${deployName} has ${replicasdesired} replicas desired but ${replicasAvailable} are available`;
  var reason = '';
  var deploy = {} as Deployment;
  for (const hit of hits) {
    const { fields = {} } = hit;
    const podPhase = extractFieldValue(fields['metrics.k8s.pod.phase']);
    const podName = extractFieldValue(fields['resource.attributes.k8s.pod.name']);
    var state = phaseToState(podPhase)
    if (podPhase !== 2 && podPhase !== 3) {
      reason = `Pod ${namespace}/${podName} is in ${state} state`;
      var failingReason = {} as Event;
      const event = await getPodEvents(client, podName, period, namespace);
      if (event.note != '') {
        failingReason = event;
      }
      const pod = {
        'name': podName,
        'state': state,
        'event': failingReason,
      };
      notRunningPods.push(pod);
    } else {
        const [podContainerStatus, container, conTime] = await getPodContainersStatus(client, podName, period, namespace);
        state = podContainerStatus === 'Not Ready' ? 'Not Ready' : state;
        if (podContainerStatus === 'Not Ready') {
          const failingMessage = `Pod ${namespace}/${podName} is in ${state} state because container ${container} is not Ready. Check the container's logs for more details`
          failingReason = {
            note: failingMessage,
            reason: `Container ${container} may be crashing`,
            type: 'Warning',
            time: conTime,
            kind: 'Container',
            object: container
          }
          const pod = {
            'name': podName,
            'state': state,
            'event': failingReason,
          };
          notRunningPods.push(pod);
        } 
    }
  }
  var reasons = new Array();
  var events = new Array();
  for (const pod of notRunningPods) {
    reason = `Pod ${namespace}/${pod.name} is in ${pod.state} state`;
    reasons.push(reason);
    if (Object.keys(pod.event).length !== 0) {
      events.push(pod.event);
    }
  }
  deploy = {
    time: '',
    message: message,
    replicasAvailable: replicasAvailable,
    replicasDesired: replicasdesired,
    name: deployName,
    namespace: namespace,
    reason: reasons.join(" & "),
    events: events,
  }
  return deploy
}
