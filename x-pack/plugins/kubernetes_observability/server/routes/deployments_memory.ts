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
import { extractFieldValue } from '../lib/utils';
import { defineQueryForPodsMemoryUtilisation, calulcatePodsMemoryUtilisation } from '../lib/pods_memory_utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  DEPLOYMENT_MEMORY_ROUTE,
} from '../../common/constants';

export const registerDeploymentsMemoryRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DEPLOYMENT_MEMORY_ROUTE,
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
          { exists: { field: 'metrics.k8s.pod.phase' } }
        ];
        const dslPods: estypes.SearchRequest = {
          index: ["metrics-otel.*"],
          sort: [{ '@timestamp': 'desc' }],
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
        if (esResponsePods.hits.hits.length > 0) {
          var reasons = new Array();
          var messages = new Array();
          const hitsPods = esResponsePods.hits.hits[0];
          const { fields = {} } = hitsPods;
          const hitsPodsAggs = esResponsePods.aggregations!.unique_values['buckets'];
          //console.log("hitspods:"+hitsPodsAggs);
          const time = extractFieldValue(fields['@timestamp']);
          for (var entries of hitsPodsAggs) {
            const podName = entries.key;
            console.log(podName);
            const dslPodsCpu = defineQueryForPodsMemoryUtilisation(podName, request.query.namespace, client)
            const esResponsePodsCpu = await client.search(dslPodsCpu);
            const [reason, message] = calulcatePodsMemoryUtilisation(podName, request.query.namespace, esResponsePodsCpu)
            reasons.push(reason);
            messages.push(message);
            console.log("reason:" + reason, "message:" + message);
          }
          return response.ok({
            body: {
              time: time,
              message: messages,
              name: request.query.deployment_name,
              namespace: request.query.namespace,
              reason: reasons,
            },
          });
        } else {
          const message = `Deployment ${request.query.namespace}/${request.query.deployment_name} not found`
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
