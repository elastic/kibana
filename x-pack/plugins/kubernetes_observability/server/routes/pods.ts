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
        const hit = esResponse.hits.hits[0];
        const { fields = {} } = hit;
        const podPhase = extractFieldValue(fields['metrics.k8s.pod.phase']);
        const nodeName = extractFieldValue(fields['resource.attributes.k8s.node.name']);
        const time = extractFieldValue(fields['@timestamp']);
        const state = phaseToState(podPhase);
        return response.ok({
          body: {
            time: time,
            message: "Pod " + request.query.namespace + "/" + request.query.pod_name + " is in " + state + " state",
            state: state,
            name: request.query.pod_name,
            namespace: request.query.namespace,
            node: nodeName,
          },
        });
      }
    );
};

 function extractFieldValue<T>(maybeArray: T | T[] | undefined): T {
    return toArray(maybeArray)[0];
}

 function toArray<T>(maybeArray: T | T[] | undefined): T[] {
    if (!maybeArray) {
      return [];
    }
    if (Array.isArray(maybeArray)) {
      return maybeArray;
    }
    return [maybeArray];
  }

  function phaseToState(phase: number) {
    switch(phase) { 
        case 1: { 
           return "Pending"; 
        } 
        case 2: { 
            return "Running"; 
        } 
        case 3: { 
            return "Succeeded"; 
        }
        case 4: { 
            return "Failed"; 
        }
        case 5: { 
            return "Unknown"; 
        }  
        default: { 
            return "Unknown"; 
        } 
     } 
  }