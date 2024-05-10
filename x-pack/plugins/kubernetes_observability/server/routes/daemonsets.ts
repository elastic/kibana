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
import {extractFieldValue, phaseToState, Event, checkDefaultNamespace} from '../lib/utils';
import {getPodEvents} from './pods';
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
              name: schema.string(),
              namespace: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        var namespace = checkDefaultNamespace(request.query.namespace);
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const musts = [
            {
                term: {
                  'resource.attributes.k8s.daemonset.name': request.query.name,
                },
            },
            {
                term: {
                  'resource.attributes.k8s.namespace.name': request.query.namespace,
                },
            },
            {   exists: { field: 'metrics.k8s.daemonset.ready_nodes' } 
            }
          ];
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
              },
            },
        };
        console.log(musts);
        console.log(dsl);
        const esResponse = await client.search(dsl);
        console.log(esResponse);
        if (esResponse.hits.hits.length > 0) {
            const hit = esResponse.hits.hits[0];
            const { fields = {} } = hit;
            const readyNodes = extractFieldValue(fields['metrics.k8s.daemonset.ready_nodes']);
            const desiredNodes = extractFieldValue(fields['metrics.k8s.daemonset.desired_scheduled_nodes']);
            var message = '';
            var reason = '';
            const time = extractFieldValue(fields['@timestamp']);
            if (readyNodes == desiredNodes) {
                message = `Daemonset ${namespace}/${request.query.name} has as many ready nodes as desired`;
                return response.ok({
                    body: {
                    time: time,
                    message: message,
                    readyNodes: readyNodes,
                    desiredNodes: desiredNodes,
                    name: request.query.name,
                    namespace: namespace,
                    reason: reason,
                    },
                });
            } else {
                console.log("replicas desired not equal to available");
                const musts = [
                    {
                        term: {
                        'resource.attributes.k8s.daemonset.name': request.query.name,
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
                for (const hit of hits) {
                    const { fields = {} } = hit;
                    const podPhase = extractFieldValue(fields['metrics.k8s.pod.phase']);
                    const podName = extractFieldValue(fields['resource.attributes.k8s.pod.name']);
                    message = `Daemonset ${namespace}/${request.query.name} has ${desiredNodes} desired nodes desired but ${readyNodes} are ready`;
                    if (podPhase !== 2 && podPhase !== 3) {
                        console.log(podName);
                        console.log(podPhase);
                        const state = phaseToState(podPhase);
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
                    }
                }
                var reasons = new Array();
                var events = new Array();
                for (const pod of notRunningPods) {
                    reason += `Pod ${namespace}/${pod.name} is in ${pod.state} state`;
                    reasons.push(reason)
                    if (Object.keys(pod.event).length !== 0) {
                        events.push(pod.event);
                    }
                }
                return response.ok({
                    body: {
                    time: time,
                    message: message,
                    readyNodes: readyNodes,
                    desiredNodes: desiredNodes,
                    name: request.query.name,
                    namespace: namespace,
                    reason: reasons.join(" & "),
                    events: events,
                    },
                });
            }
        } else {
            message =  `Daemonset ${namespace}/${request.query.name} not found`
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
