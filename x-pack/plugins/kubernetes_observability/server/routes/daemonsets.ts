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
import {extractFieldValue, phaseToState, Event, Daemonset, checkDefaultPeriod} from '../lib/utils';
import {getPodEvents, getPodContainersStatus} from './pods';
import { IRouter, Logger } from '@kbn/core/server';
import {
    DAEMONSET_STATUS_ROUTE,
} from '../../common/constants';

export const registerDaemonsetsRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DAEMONSET_STATUS_ROUTE,
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
        var daemonsetNames = new Array();
        if (request.query.name !== undefined) {
          daemonsetNames.push(request.query.name);
        };
        if (request.query.name === undefined) {
          var daemonmusts = new Array();
          daemonmusts.push(
            { exists: { field: 'resource.attributes.k8s.daemonset.name' } }
          )
          if (request.query.namespace !== undefined) {
            daemonmusts.push(
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
          const dslDaemons: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            _source: false,
            fields: [
            'resource.attributes.k8s.daemonset.name',
            ],
            query: {
              bool: {
                  must: daemonmusts,
                  filter: filter,
              },
            },
            aggs: {
                unique_values: {
                    terms: { field: 'resource.attributes.k8s.daemonset.name', size: 500 },
                },
            },
          };
          const daemonEsResponse = await client.search(dslDaemons);
          const { after_key: _, buckets = [] } = (daemonEsResponse.aggregations?.unique_values || {}) as any;
          if (buckets.length > 0) {
            buckets.map((bucket: any) => {
              const daemonName = bucket.key;
              daemonsetNames.push(daemonName);
            });
          }
          console.log(daemonsetNames);
        }

        if (daemonsetNames.length === 0){
          const message =  `No daemonsets found`
          return response.ok({
              body: {
                time: '',
                message: message,
                name: request.query.name,
                namespace: request.query.namespace,
                reason: "Not found",
                daemonsets: [],
              },
            });
        }

        if (daemonsetNames.length === 1) {
          const daemonObject = await getDaemonStatus(client, period, daemonsetNames[0], request.query.namespace);
          if (Object.keys(daemonObject).length === 0) {
            var fullName = daemonsetNames[0];
            if (request.query.namespace !== undefined) {
              fullName = request.query.namespace + "/" + daemonsetNames[0];
            };
            const message =  `Daemonset ${fullName} not found`
            return response.ok({
                body: {
                  time: '',
                  message: message,
                  name: daemonsetNames[0],
                  namespace: request.query.namespace,
                  reason: "Not found",
                  daemonsets: [],
                },
              });
          }
          return response.ok({
            body: {
              time: daemonObject.time,
              daemonsets: [daemonObject]
            },
          });
        }

        var daemonObjects = new Array();
        for (const name of daemonsetNames) {
           const daemonObject = await getDaemonStatus(client, period, name, request.query.namespace);
           daemonObjects.push(daemonObject);
        }
        return response.ok({
          body: {
            time: daemonObjects[0].time,
            daemonsets: daemonObjects
          },
        });
      }
    );
};



export async function getDaemonStatus(client: any, period: string, daemonName: string, namespace?: string): Promise<Daemonset>{
  var musts = new Array();
  musts.push(
    {
      term: {
        'resource.attributes.k8s.daemonset.name': daemonName,
      },
    },
    { exists: { field: 'metrics.k8s.daemonset.ready_nodes' } }
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
      'metrics.k8s.daemonset.ready_nodes',
      'metrics.k8s.daemonset.desired_scheduled_nodes',
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
  var daemonset = {} as Daemonset;
  if (esResponse.hits.hits.length > 0) {
    const hit = esResponse.hits.hits[0];
    const { fields = {} } = hit;
    const readyNodes = extractFieldValue(fields['metrics.k8s.daemonset.ready_nodes']);
    const desiredNodes = extractFieldValue(fields['metrics.k8s.daemonset.desired_scheduled_nodes']);
    const daemonNamespace =  extractFieldValue(fields['resource.attributes.k8s.namespace.name']);
    var message = '';
    var reason = '';
    const time = extractFieldValue(fields['@timestamp']);
    
    if (readyNodes == desiredNodes) {
      message = `Daemonset ${daemonNamespace}/${daemonName} has as many ready nodes as desired`;
      daemonset = {
          time: time,
          message: message,
          readyNodes: readyNodes,
          desiredNodes: desiredNodes,
          name: daemonName,
          namespace: daemonNamespace,
          reason: reason,
          events: []
        }
    } else {
        console.log("replicas desired not equal to available");
        daemonset = await getDaemonPods(client, period, daemonName, daemonNamespace, readyNodes, desiredNodes)
        daemonset.time = time;
        return daemonset;
    }
  }
  return daemonset;

}

export async function getDaemonPods(client: any, period: string, daemonName: string, namespace: string, readyNodes: string, desiredNodes: string): Promise<Daemonset>{
  const musts = [
    {
      term: {
        'resource.attributes.k8s.daemonset.name': daemonName,
      },
    },
    {
      term: {
        'resource.attributes.k8s.namespace.name': namespace,
      },
    },
    { exists: { field: 'metrics.k8s.pod.phase' } }
  ];
  var size: number = +desiredNodes;
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
  const message = `Daemonset ${namespace}/${daemonName} has ${desiredNodes} nodes desired but ${readyNodes} are ready`;
  var reason = '';
  var daemonset = {} as Daemonset;
  for (const hit of hits) {
    const { fields = {} } = hit;
    const podPhase = extractFieldValue(fields['metrics.k8s.pod.phase']);
    const podName = extractFieldValue(fields['resource.attributes.k8s.pod.name']);
    var state = phaseToState(podPhase)
    if (podPhase !== 2 && podPhase !== 3) {
      reason = `Pod ${namespace}/${podName} is in ${state} state`;
      var failingReason = {} as Event;
      const event = await getPodEvents(client, podName, namespace);
      if (event.note != '') {
        failingReason = event;
      }
      var pod = {
        'name': podName,
        'state': state,
        'event': failingReason,
      };
      notRunningPods.push(pod);
    } else {
        const [podContainerStatus, container, conTime] = await getPodContainersStatus(client, podName, namespace);
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
  daemonset = {
    time: '',
    message: message,
    readyNodes: readyNodes,
    desiredNodes: desiredNodes,
    name: daemonName,
    namespace: namespace,
    reason: reasons.join(" & "),
    events: events,
  }
  return daemonset
}
