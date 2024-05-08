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
import {extractFieldValue, round} from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
    POD_MEMORY_ROUTE,
} from '../../common/constants';
import { double } from '@elastic/elasticsearch/lib/api/types';

export const registerPodsMemoryRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: POD_MEMORY_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              pod_name: schema.string(),
              namespace: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const musts = [
          {
            term: {
              'resource.attributes.k8s.pod.name': request.query.pod_name,
            },
          },
          {
            term: {
              'resource.attributes.k8s.namespace.name': request.query.namespace,
            },
          },
          { exists: { field: 'metrics.k8s.pod.memory.usage' } }
          ];
        const dsl: estypes.SearchRequest = {
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
                must: musts,
              },
            },
        };
        
        console.log(musts);
        console.log(dsl);
        const esResponse = await client.search(dsl);
        console.log(esResponse);
        if (esResponse.hits.hits.length > 0) {
          type Limits = {
            [key: string]: double ;
          };
          const limits: Limits = {
            medium: 0.7,
            high: 0.9,
          };
          
            const hit = esResponse.hits.hits[0];
            const { fields = {} } = hit;
            const memory_usage = extractFieldValue(fields['metrics.k8s.pod.memory.usage'])
            const memory_available = extractFieldValue(fields['metrics.k8s.pod.memory.available'])
            const podMemoryUtilization = round(memory_usage/memory_available,3);
            var message = '';
            var reason = '';
            const time = extractFieldValue(fields['@timestamp']);
            if (podMemoryUtilization < limits["medium"]) {
              reason = "Low"
            }else if(podMemoryUtilization >= limits["medium"] && podMemoryUtilization < limits["high"]){
              reason = "Medium"
            }else {
              reason = "High"
            }

                message = `Pod ${request.query.namespace}/${request.query.pod_name} has CPU utilisation ${podMemoryUtilization}!
                          Memory usage: ${memory_usage} Bytes
                          Memory available: ${memory_available} Bytes
                          `;
                return response.ok({
                    body: {
                    time: time,
                    message: message,
                    name: request.query.pod_name,
                    namespace: request.query.namespace,
                    reason: reason+" memory utilisation",
                    },
                });
              } else {
              const message =  `Pod ${request.query.namespace}/${request.query.pod_name} not found`
              return response.ok({
                  body: {
                    time: '',
                    message: message,
                    name: request.query.pod_name,
                    namespace: request.query.namespace,
                    reason: "Not found",
                  },
              });
            }
          }
        );
  };
