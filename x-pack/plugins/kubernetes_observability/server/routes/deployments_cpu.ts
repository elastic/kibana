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
import {extractFieldValue} from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
    DEPLOYMENT_CPU_ROUTE,
} from '../../common/constants';
import { double } from '@elastic/elasticsearch/lib/api/types';

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
              deployment_name: schema.string(),
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
                  'resource.attributes.k8s.deployment.name': request.query.deployment_name,
                },
              },
              {
                term: {
                  'resource.attributes.k8s.namespace.name': request.query.namespace,
                },
              },
              { exists: { field: 'metrics.k8s.deployment.available' } }
          ];
        const dsl: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            size: 1,
            sort: [{ '@timestamp': 'desc' }],
            _source: false,
            fields: [
              '@timestamp',
              'metrics.k8s.deployment.available',
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
        console.log(esResponse.hits);
        if (esResponse.hits.hits.length > 0) {
          const hit = esResponse.hits.hits[0];
          const { fields = {} } = hit;
          const replicasAvailable = extractFieldValue(fields['metrics.k8s.deployment.available']);
          const mustsPods = [
            {
                term: {
                'resource.attributes.k8s.deployment.name': request.query.deployment_name,
                },
            },
            {
                term: {
                'resource.attributes.k8s.namespace.name': request.query.namespace,
                },
            },
            { exists: { field: 'resource.attributes.k8s.pod.name' } }
          ];
            const dslPods: estypes.SearchRequest = {
                index: ["metrics-otel.*"],
                sort: [{ '@timestamp': 'desc' }],
                _source: false,
                fields: [
                '@timestamp',
                "metrics.k8s.pod.phase",
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
                size: replicasAvailable
          };
                
          console.log(mustsPods);
          console.log(dslPods);
          const esResponsePods = await client.search(dslPods);
          console.log(esResponsePods);
  
          const hitsPods = esResponsePods.hits.hits;
          var reasons = new Array();
          var messages = new Array();            
          const time = extractFieldValue(fields['@timestamp']);
          var message = '';
          var reason = '';
          var alarm = '';
          for (const hitpod of hitsPods) {
            const { fields = {} } = hitpod;
            const podName = extractFieldValue(fields['resource.attributes.k8s.pod.name']);                    
              const mustsPodsCpu = [
                {
                    term: {
                    'resource.attributes.k8s.pod.name': podName,
                    },
                },
                {
                    term: {
                    'resource.attributes.k8s.namespace.name': request.query.namespace,
                    },
                },
                { exists: { field: 'metrics.k8s.pod.cpu.utilization' } }
              ];
                const dslPodsCpu: estypes.SearchRequest = {
                    index: ["metrics-otel.*"],
                    sort: [{ '@timestamp': 'desc' }],
                    _source: false,
                    fields: [
                    '@timestamp',
                    "metrics.k8s.pod.cpu.utilization",
                    'resource.attributes.k8s.*',
                    ],
                    query: {
                    bool: {
                        must: mustsPodsCpu,
                    },
                    },
                  size:1
              };
                    
              console.log(mustsPodsCpu);
              console.log(dslPodsCpu);
              const esResponsePodsCpu = await client.search(dslPodsCpu);
              console.log(esResponsePodsCpu);

              const podCpuUtilization = extractFieldValue(fields['metrics.k8s.pod.cpu.utilization']);
              console.log(podCpuUtilization);
              type Limits = {
                [key: string]: double ;
              };
              const limits: Limits = {
                medium: 0.7,
                high: 0.9,
              };
              if (podCpuUtilization < limits["medium"]) {
                alarm = "Low"
              }else if(podCpuUtilization >= limits["medium"] && podCpuUtilization < limits["high"]){
                alarm = "Medium"
              }else {
                alarm = "High"
              }
              reason = `Pod ${request.query.namespace}/${podName} Reason: ${alarm} CPU utilisation`;
              reasons.push(reason);
              message = `Pod ${request.query.namespace}/${podName} has CPU utilisation ${podCpuUtilization}}`;
              messages.push(message);
          }
            return response.ok({
                    body: {
                    time: time,
                    message: messages.join(" & "),
                    name: request.query.deployment_name,
                    namespace: request.query.namespace,
                    reason: reasons.join(" & "),
                    },
                });
        } else {
              const message =  `Deployment ${request.query.namespace}/${request.query.deployment_name} not found`
              return response.ok({
                  body: {
                    time: '',
                    message: message,
                    name: request.query.deployment_name,
                    namespace: request.query.namespace,
                    reason: "Not found",
                  },
              });
          }
      }
    );
  };
