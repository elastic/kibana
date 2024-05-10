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
import { extractFieldValue, round, checkDefaultNamespace } from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  DAEMONSET_MEMORY_ROUTE,
} from '../../common/constants';
import { double } from '@elastic/elasticsearch/lib/api/types';

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
              'resource.attributes.k8s.namespace.name': namespace,
            },
          },
          { exists: { field: 'metrics.k8s.daemonset.ready_nodes' } }
        ];
        const dsl: estypes.SearchRequest = {
          index: ["metrics-otel.*"],
          size: 1,
          sort: [{ '@timestamp': 'desc' }],
          _source: false,
          fields: [
            '@timestamp',
            'metrics.k8s.daemonset.ready_nodes',
            'resource.attributes.k8s.*',
          ],
          query: {
            bool: {
              must: musts,
            },
          },
        };
        //console.log(musts);
        //console.log(dsl);
        const esResponse = await client.search(dsl);
        console.log(esResponse.hits);
        if (esResponse.hits.hits.length > 0) {
          const hit = esResponse.hits.hits[0];
          const { fields = {} } = hit;
          const readynodesAvailable = extractFieldValue(fields['metrics.k8s.daemonset.ready_nodes']);
          const mustsPods = [
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
          const dslPods: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            sort: [{ '@timestamp': 'desc' }],
            size: Number(readynodesAvailable),
            _source: false,
            fields: [
              '@timestamp',
              'metrics.k8s.pod.phase',
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

          const hitsPods = esResponsePods.hits.hits;
          //console.log(hitsPods);

          const time = extractFieldValue(fields['@timestamp']);
          var reasons = new Array();
          var messages = new Array();
          var message = '';
          var reason = '';
          var alarm = '';

          for (const hitpod of hitsPods) {
            const { fields = {} } = hitpod;
            const podName = extractFieldValue(fields['resource.attributes.k8s.pod.name']);
            console.log(podName);
            const mustsPodsCpu = [
              {
                term: {
                  'resource.attributes.k8s.pod.name': podName,
                },
              },
              {
                term: {
                  'resource.attributes.k8s.namespace.name': namespace,
                },
              },
              { exists: { field: 'metrics.k8s.pod.memory.usage' } }
            ];
            const dslPodsCpu: estypes.SearchRequest = {
              index: ["metrics-otel.*"],
              size: 1,
              sort: [{ '@timestamp': 'desc' }],
              _source: false,
              fields: [
                '@timestamp',
                'metrics.k8s.pod.memory.*',
                'resource.attributes.k8s.*',
              ],
              query: {
                bool: {
                  must: mustsPodsCpu,
                },
              },
            };

            // console.log(mustsPodsCpu);
            // console.log(dslPodsCpu);
            const esResponsePodsCpu = await client.search(dslPodsCpu);
            if (esResponsePodsCpu.hits.hits.length > 0) {
              const hitpodcpu = esResponsePodsCpu.hits.hits[0];
              const { fields = {} } = hitpodcpu;
              console.log(hitpod);

              const memory_available = extractFieldValue(fields['metrics.k8s.pod.memory.available']);
              const memory_usage = extractFieldValue(fields['metrics.k8s.pod.memory.usage']);
              if (memory_available != null) {
                const podMemoryUtilization = round(memory_usage / memory_available, 3);

                type Limits = {
                  [key: string]: double;
                };
                const limits: Limits = {
                  medium: 0.7,
                  high: 0.9,
                };
                if (podMemoryUtilization < limits["medium"]) {
                  alarm = "Low"
                } else if (podMemoryUtilization >= limits["medium"] && podMemoryUtilization < limits["high"]) {
                  alarm = "Medium"
                } else {
                  alarm = "High"
                }
                reason = `Pod ${namespace}/${podName} Reason: ${alarm} Memory utilisation`;
                reasons.push(reason);
                message = `Pod ${namespace}/${podName} has Memory utilisation ${podMemoryUtilization}`;
                messages.push(message);
              } else {
                reason = `Pod ${namespace}/${podName} Reason: No memory limit defined`;
                reasons.push(reason);
                message = `Pod ${namespace}/${podName} has Memory usage ${memory_usage} Bytes`;
                messages.push(message);
              }
            }
          }
          return response.ok({
            body: {
              time: time,
              message: messages.join(" & "),
              name: request.query.name,
              namespace: namespace,
              reason: reasons.join(" & "),
            },
          });
        } else {
          const message = `Daemonset ${namespace}/${request.query.name} not found`
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
