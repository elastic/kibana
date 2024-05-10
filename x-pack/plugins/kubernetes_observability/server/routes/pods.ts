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
import {extractFieldValue, phaseToState, Event, checkDefaultNamespace } from '../lib/utils';
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
                  'resource.attributes.k8s.pod.name': request.query.name,
                },
              },
              {
                term: {
                  'resource.attributes.k8s.namespace.name': namespace,
                },
              },
              { exists: { field: 'metrics.k8s.pod.phase' } }
          ];
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
        if (esResponse.hits.hits.length > 0) {
        const hit = esResponse.hits.hits[0];
        const { fields = {} } = hit;
        const podPhase = extractFieldValue(fields['metrics.k8s.pod.phase']);
        const nodeName = extractFieldValue(fields['resource.attributes.k8s.node.name']);
        const time = extractFieldValue(fields['@timestamp']);
        const state = phaseToState(podPhase);
        var failingReason = {} as Event;
        if (state !== 'Succeeded' && state !== 'Running') {
          const event = await getPodEvents(client, request.query.name, namespace);
          if (event.note != '') {
            failingReason = event;
          }
        }
        return response.ok({
          body: {
            time: time,
            message: "Pod " + namespace + "/" + request.query.name + " is in " + state + " state",
            state: state,
            name: request.query.name,
            namespace: namespace,
            node: nodeName,
            failingReason: failingReason,
          },
        });
      } else {
        const message =  `Pod ${namespace}/${request.query.name} not found`
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

export async function getPodEvents(client: any, podName: string, namespace: string): Promise<Event>{

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
