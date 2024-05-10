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
  POD_CPU_ROUTE,
} from '../../common/constants';
import { double } from '@elastic/elasticsearch/lib/api/types';

export const registerPodsCpuRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: POD_CPU_ROUTE,
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
          { exists: { field: 'metrics.k8s.pod.cpu.utilization' } }
        ];
        const dsl: estypes.SearchRequest = {
          index: ["metrics-otel.*"],
          size: 1,
          sort: [{ '@timestamp': 'desc' }],
          _source: false,
          fields: [
            '@timestamp',
            'metrics.k8s.pod.cpu.utilization',
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
            [key: string]: double;
          };
          const limits: Limits = {
            medium: 0.7,
            high: 0.9,
          };

          const hit = esResponse.hits.hits[0];
          const { fields = {} } = hit;
          const podCpuUtilization = round(extractFieldValue(fields['metrics.k8s.pod.cpu.utilization']),3);
          var message = '';
          var reason = '';
          const time = extractFieldValue(fields['@timestamp']);
          if (podCpuUtilization < limits["medium"]) {
            reason = "Low"
          } else if (podCpuUtilization >= limits["medium"] && podCpuUtilization < limits["high"]) {
            reason = "Medium"
          } else {
            reason = "High"
          }

          message = `Pod ${namespace}/${request.query.name} has CPU utilisation ${podCpuUtilization}%`;
          return response.ok({
            body: {
              time: time,
              message: message,
              name: request.query.name,
              namespace: namespace,
              reason: reason + " cpu utilisation",
            },
          });
        } else {
          const message = `Pod ${namespace}/${request.query.name} not found`
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
