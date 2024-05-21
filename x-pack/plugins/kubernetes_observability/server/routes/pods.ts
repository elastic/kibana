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
import {extractFieldValue, phaseToState, Event, Pod, checkDefaultNamespace } from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
    POD_STATUS_ROUTE,
} from '../../common/constants';

export const registerPodsRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: POD_STATUS_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              name: schema.maybe(schema.string()),
              namespace: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        var namespace = checkDefaultNamespace(request.query.namespace);
        console.log("namespace:"+namespace)
        var podNames = new Array();
        if (request.query.name !== undefined) {
          podNames.push(request.query.name);
        };
      
        if (request.query.name === undefined) {
          var podmusts = new Array();
          podmusts.push(
            { exists: { field: 'resource.attributes.k8s.pod.name' } }
          )
          if (request.query.namespace !== undefined) {
            podmusts.push(
                {
                    term: {
                        'resource.attributes.k8s.namespace.name': request.query.namespace,
                    },
                },
            )
          };
          const dslPods: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            _source: false,
            fields: [
            'resource.attributes.k8s.pod.name',
            ],
            query: {
              bool: {
                  must: podmusts,
              },
            },
            aggs: {
                unique_values: {
                    terms: { field: 'resource.attributes.k8s.pod.name', size: 500 },
                },
            },
          };
          const podEsclient = (await context.core).elasticsearch.client.asCurrentUser;
          const podEsResponse = await podEsclient.search(dslPods);
          const { after_key: _, buckets = [] } = (podEsResponse.aggregations?.unique_values || {}) as any;
          if (buckets.length > 0) {
            buckets.map((bucket: any) => {
              const podName = bucket.key;
              podNames.push(podName);
            });
          }
        }

        const client = (await context.core).elasticsearch.client.asCurrentUser;
        console.log("AAAAAAAAAA");
        console.log(podNames);
        if (podNames.length === 0){
          const message =  `Pod ${request.query.namespace}/${request.query.name} not found`
          return response.ok({
              body: {
                time: '',
                message: message,
                name: request.query.name,
                namespace: request.query.namespace,
                reason: "Not found",
              },
            });
        }

        if (podNames.length === 1) {
          const podObject = await getPodStatus(client, podNames[0], request.query.namespace);
          if (Object.keys(podObject).length === 0) {
            var fullName = podNames[0];
            if (request.query.namespace !== undefined) {
              fullName = request.query.namespace + "/" + podNames[0];
            };
            const message =  `Pod ${fullName} not found`
            return response.ok({
                body: {
                  time: '',
                  message: message,
                  name: podNames[0],
                  namespace: request.query.namespace,
                  reason: "Not found",
                },
              });
          }
          return response.ok({
            body: {
              time: podObject.time,
              message: podObject.message,
              state: podObject.state,
              name: podObject.name,
              namespace: podObject.namespace,
              node: podObject.node,
              failingReason: podObject.failingReason,
            },
          });
        }
        var podObjects = new Array();
        for (const name of podNames) {
           const podObject = await getPodStatus(client, name, request.query.namespace);
           podObjects.push(podObject);
        }
        return response.ok({
          body: {
            time: podObjects[0].time,
            pods: podObjects
          },
        });
      }
    );
};

export async function getPodEvents(client: any, podName: string, namespace?: string): Promise<Event>{
  const musts = [
    {
        term: {
          'Body.object.regarding.name': podName,
        },
      },
      {
        term: {
          'Body.object.metadata.namespace': namespace,
        },
      },
      {
        term: {
          'Body.object.kind': "Event"
        }
      }
  ];

  const must_not = [
    {
      term: {
        'Body.object.type': "Normal"
      }
    }
  ];

  const dsl: estypes.SearchRequest = {
    index: ["logs-generic-*"],
    size: 1,
    sort: [{ '@timestamp': 'desc' }],
    _source: false,
    fields: [
      '@timestamp',
      'Body.object.*',
    ],
    query: {
      bool: {
        must: musts,
        must_not: must_not,
      },
    },
  };

  const esResponse = await client.search(dsl);
  var  event = {} as Event;
  if (esResponse.hits.hits.length > 0) {
    const hit = esResponse.hits.hits[0];
    const { fields = {} } = hit;
    const reason = extractFieldValue(fields['Body.object.reason']);
    const note = extractFieldValue(fields['Body.object.note']);
    const eventType = extractFieldValue(fields['Body.object.type']);
    const lastObserved = extractFieldValue(fields['Body.object.series.lastObservedTime']);
    event = {
      'reason': reason,
      'note': note,
      'time': lastObserved,
      'type': eventType,
      'kind': "Pod",
      'object': podName
    };
  }
  return event;
}


export async function getPodStatus(client: any, podName: string, namespace?: string): Promise<Pod>{

  var musts = new Array();
  musts.push(
    {
      term: {
        'resource.attributes.k8s.pod.name': podName,
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
 
  const dsl: estypes.SearchRequest = {
    index: ["metrics-otel.*"],
    size: 1,
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
  };

  const esResponse = await client.search(dsl);
  console.log(esResponse);
  console.log(esResponse.hits.hits.length);
  var pod = {} as Pod;
  if (esResponse.hits.hits.length > 0) {
    const hit = esResponse.hits.hits[0];
    const { fields = {} } = hit;
    const podPhase = extractFieldValue(fields['metrics.k8s.pod.phase']);
    const nodeName = extractFieldValue(fields['resource.attributes.k8s.node.name']);
    const time = extractFieldValue(fields['@timestamp']);
    const state = phaseToState(podPhase);
    const podNamespace =  extractFieldValue(fields['resource.attributes.k8s.namespace.name']);
    var failingReason = {} as Event;
    if (state !== 'Succeeded' && state !== 'Running') {
      const event = await getPodEvents(client, podName, podNamespace);
      if (event.note != '') {
        failingReason = event;
      }
    }
    pod = {
      time: time,
      message: "Pod " + podNamespace + "/" + podName + " is in " + state + " state",
      state: state,
      name: podName,
      namespace: podNamespace,
      node: nodeName,
      failingReason: failingReason,
    }
}

  return pod;
}