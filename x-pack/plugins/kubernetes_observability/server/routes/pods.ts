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
import {extractFieldValue, phaseToState, conStatusToState, Event, Pod, checkDefaultPeriod } from '../lib/utils';
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
              deployment: schema.maybe(schema.string()),
              daemonset: schema.maybe(schema.string()),
              period: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        const period = checkDefaultPeriod(request.query.period);
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
          if (request.query.deployment !== undefined) {
            podmusts.push(
              {
                  term: {
                      'resource.attributes.k8s.deployment.name': request.query.deployment,
                  },
              },
            )
          };
          if (request.query.daemonset !== undefined) {
            podmusts.push(
              {
                  term: {
                      'resource.attributes.k8s.daemonset.name': request.query.daemonset,
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
          const dslPods: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            _source: false,
            fields: [
            'resource.attributes.k8s.pod.name',
            ],
            query: {
              bool: {
                  must: podmusts,
                  filter: filter
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
                pods: [],
              },
            });
        }

        if (podNames.length === 1) {
          const podObject = await getPodStatus(client, podNames[0], period, request.query.namespace);
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
                  pods: [],
                },
              });
          }
          return response.ok({
            body: {
              time: podObject.time,
              pods: [podObject],
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

export async function getPodEvents(client: any, podName: string, period: string, namespace?: string): Promise<Event>{
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
        filter: filter
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


export async function getPodStatus(client: any, podName: string, period: string, namespace?: string): Promise<Pod>{

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
      'metrics.k8s.pod.phase',
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
  console.log(esResponse);
  console.log(esResponse.hits.hits.length);
  var pod = {} as Pod;
  var state = '';
  var message = ''
  if (esResponse.hits.hits.length > 0) {
    const hit = esResponse.hits.hits[0];
    const { fields = {} } = hit;
    const podPhase = extractFieldValue(fields['metrics.k8s.pod.phase']);
    const nodeName = extractFieldValue(fields['resource.attributes.k8s.node.name']);
    const time = extractFieldValue(fields['@timestamp']);
    state = phaseToState(podPhase);
    const podNamespace =  extractFieldValue(fields['resource.attributes.k8s.namespace.name']);
    var failingReason = {} as Event;
    message = "Pod " + podNamespace + "/" + podName + " is in " + state + " state";
    if (state !== 'Succeeded' && state !== 'Running') {
      const event = await getPodEvents(client, podName, period, podNamespace);
      if (event.note != '') {
        failingReason = event;
      }
    } else {
      const [podContainerStatus, container, contTime] = await getPodContainersStatus(client, podName, period, podNamespace);
      state = podContainerStatus === 'Not Ready' ? 'Failed' : state;
      if (podContainerStatus === 'Not Ready') {
        const failingMessage = `Pod ${podNamespace}/${podName} is in ${state} state because container ${container} is not Ready. Check the container's logs for more details`
        message = podContainerStatus === 'Not Ready' ? failingMessage : message;
        failingReason = {
          note: `Container ${container} is not Ready. Check the container's logs for more details`,
          reason: `Container ${container} may be crashing`,
          type: 'Warning',
          time: contTime,
          kind: 'Container',
          object: container
        }
      }
    }
    const ref = createLogRef(time, podName) 
    pod = {
      time: time,
      message: message,
      state: state,
      name: podName,
      namespace: podNamespace,
      node: nodeName,
      failingReason: failingReason,
      logref: ref,
    }
}

  return pod;
}

export async function getPodContainersStatus(client: any, podName: string, period: string, namespace?: string){

  var musts = new Array();
  musts.push(
    {
      term: {
        'resource.attributes.k8s.pod.name': podName,
      },
    },
    { exists: { field: 'metrics.k8s.container.ready' } }
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
      'metrics.k8s.container.ready',
      'resource.attributes.k8s.container.name'
    ],
    query: {
      bool: {
        must: musts,
        filter: filter
      },
    },
  };

  const esResponse = await client.search(dsl);
  console.log(esResponse);
  console.log(esResponse.hits.hits.length);
  var state = "Unknown";
  var containerName = '';
  var time = '';
  if (esResponse.hits.hits.length > 0) {
    const hit = esResponse.hits.hits[0];
    const { fields = {} } = hit;
    const podContainerReady = extractFieldValue(fields['metrics.k8s.container.ready']);
    containerName = extractFieldValue(fields['resource.attributes.k8s.container.name']);
    time = extractFieldValue(fields['@timestamp']);
    state = conStatusToState(podContainerReady);
}

  return [state, containerName, time];
}

function createLogRef(time: string, podName: string,): string{
  const url = 'observability-logs-explorer/?pageState=(breakdownField:log.level,columns:!((fallbackFields:!(host.name,service.name),smartField:resource,type:smart-field,width:320),(fallbackFields:!(message),smartField:content,type:smart-field),(field:resource.attributes.k8s.pod.name,type:document-field)),controls:(data_stream.namespace:(mode:include,selection:(selectedOptions:!(),type:options))),dataSourceSelection:(selectionType:all),filters:!((meta:(alias:!n,disabled:!f,field:resource.attributes.k8s.pod.name,index:%27dataset-logs-*-*%27,key:resource.attributes.k8s.pod.name,negate:!f,params:(query:'+podName+'),type:phrase),query:(match_phrase:(resource.attributes.k8s.pod.name:'+podName+')))),query:(language:kuery,query:%27%27),refreshInterval:(pause:!t,value:60000),rowHeight:0,rowsPerPage:100,time:(from:now-15m,to:now),v:2)#/'
  return url
}
