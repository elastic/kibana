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
import { calulcatePodsCpuUtilisation, defineQueryForAllPodsCpuUtilisation } from '../lib/pods_cpu_utils';

import { IRouter, Logger } from '@kbn/core/server';
import {
  DAEMONSET_CPU_ROUTE,
} from '../../common/constants';

const resource = "daemonset"
const type = "cpu"
export const registerDaemonsetsCpuRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DAEMONSET_CPU_ROUTE,
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
        const dsl: estypes.SearchRequest = {
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

        //console.log(musts);
        //console.log(dsl);
        const esResponsePods = await client.search(dsl);
        console.log(esResponsePods.hits);
        if (esResponsePods.hits.hits.length > 0) {
          const hitsPods = esResponsePods.hits.hits[0];
          const { fields = {} } = hitsPods;
          const hitsPodsAggs = esResponsePods.aggregations.unique_values['buckets'];

          const time = extractFieldValue(fields['@timestamp']);
          var messages = '';
          var reasons = '';
          var pod_reasons = new Array();
          var pod_messages = new Array();
          var pods_medium = new Array();
          var pods_high = new Array();
          var cpu = '';

          for (const entries of hitsPodsAggs) {
            const podName = entries.key;
            console.log(podName);
            const dslPodsCpu = defineQueryForAllPodsCpuUtilisation(podName, namespace, client);
            const esResponsePodsCpu = await client.search(dslPodsCpu);
            const [reason, message] = calulcatePodsCpuUtilisation(podName, namespace, esResponsePodsCpu);
            pod_reasons.push(reason);
            pod_messages.push(message);
            //Create overall message for daemonset
            for (var pod_reason of pod_reasons) {
              if (pod_reason.value == "Medium") {
                pods_medium.push(pod_reason.name);
              } else if (pod_reason.value == "High") {
                pods_high.push(pod_reason.name);
              }
            }
            if (pods_medium.length > 0) {
              messages = `${resource} has Medium ${type} utilisation in following Pods:` + pods_medium.join(" , ");
            }
            if (pods_high.length > 0) {
              messages = messages + `${resource} has High ${type} utilisation in following Pods:` + pods_high.join(" , ");
            } else {
              messages = `${resource} has Low ${type} utilisation in all Pods`;
            }

            if (pods_medium.length > 0 && pods_high.length > 0) {
              cpu = "Medium";
              reasons = "Medium " + type + " utilisation";
            }
            if (pods_high.length > 0) {
              cpu = "High"
              reasons = "High " + type + " utilisation";
            } else {
              cpu = "Low"
              reasons = "Low " + type + " utilisation";
            }
            //End of Create overall message for daemonset
          }
          return response.ok({
            body: {
              time: time,
              name: request.query.name,
              namespace: namespace,
              pod: { reasons: pod_reasons, messages: pod_messages },
              cpu: cpu,
              message: messages,
              reason: reasons,
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
