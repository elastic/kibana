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
import { extractFieldValue, checkDefaultNamespace } from '../lib/utils';
import { defineQueryForAllPodsMemoryUtilisation, calulcateAllPodsMemoryUtilisation } from '../lib/pods_memory_utils';
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
              name: schema.string(),
              namespace: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        var namespace = checkDefaultNamespace(request.query.namespace);

        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const mustsPods = [
          {
            term: {
              'resource.attributes.k8s.deployment.name': request.query.name,
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
          var pod_reasons = new Array();
          var pod_messages = new Array();
          var pods_medium = new Array();
          var pods_high = new Array();
          var messages = '';
          var reasons = '';
          var memory = '';
          const hitsPods = esResponsePods.hits.hits[0];
          const { fields = {} } = hitsPods;
          const hitsPodsAggs = esResponsePods.aggregations!.unique_values['buckets'];
          //console.log("hitspods:"+hitsPodsAggs);
          const time = extractFieldValue(fields['@timestamp']);
          for (var entries of hitsPodsAggs) {
            const podName = entries.key;
            console.log(podName);
            const dslPodsCpu = defineQueryForAllPodsMemoryUtilisation(podName, namespace, client)
            const esResponsePodsCpu = await client.search(dslPodsCpu);
            const [reason, message] = calulcateAllPodsMemoryUtilisation(podName, namespace, esResponsePodsCpu)
            pod_reasons.push(reason);
            pod_messages.push(message);

            //Create overall message for deployment
            for (var pod_reason of pod_reasons) {
              if (pod_reason.value == "Medium") {
                pods_medium.push(pod_reason.name)
              } else if (pod_reason.value == "High") {
                pods_high.push(pod_reason.name)
              }
            }
            if (pods_medium.length > 0) {
              messages = "Deployment has Medium Memory utilisation in following Pods:" + pods_medium.join(" , ");
            }
            if (pods_high.length > 0) {
              messages = messages + "Deployment has High Memory utilisation in following Pods:" + pods_high.join(" , ");
            } else {
              messages = "Deployment has Lom Memory utilisation in all Pods";
            }

            if (pods_medium.length > 0 && pods_high.length > 0) {
              memory = "Medium";
              reasons = "Medium memory utilisation";
            }
            if (pods_high.length > 0) {
              memory = "High"
              reasons = "High memory utilisation";
            } else {
              memory = "Low"
              reasons = "Low memory utilisation";
            }
            //End of Create overall message for deployment
          }
          return response.ok({
            body: {
              time: time,
              name: request.query.name,
              namespace: namespace,
              pod: { reasons: pod_reasons, messages: pod_messages },
              memory: memory,
              message: messages,
              reason: reasons,
            },
          });
        } else {
          const message = `Deployment ${namespace}/${request.query.name} not found`
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
