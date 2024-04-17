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
    DEPLOYMENT_STATUS_ROUTE,
} from '../../common/constants';

export const registerDeploymentsRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DEPLOYMENT_STATUS_ROUTE,
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
              'metrics.k8s.deployment.desired',
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
        const replicasAvailable = extractFieldValue(fields['metrics.k8s.deployment.available']);
        const replicasdesired = extractFieldValue(fields['metrics.k8s.deployment.desired']);
        var message = '';
        if (replicasAvailable == replicasdesired) {
             message = `Deployment ${request.query.namespace}/${request.query.deployment_name} has as many replicas available as desired`;
        } else {
            message = `Deployment ${request.query.namespace}/${request.query.deployment_name} has ${replicasdesired} replicas but ${replicasAvailable} are available`;
        }
        const time = extractFieldValue(fields['@timestamp']);
        return response.ok({
          body: {
            time: time,
            message: message,
            replicasAvailable: replicasAvailable,
            replicasDesired:replicasdesired,
            name: request.query.deployment_name,
            namespace: request.query.namespace,
          },
        });
      }
    );
};
