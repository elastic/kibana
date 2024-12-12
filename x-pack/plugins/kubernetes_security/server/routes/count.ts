/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IRouter, Logger } from '@kbn/core/server';
import {
  COUNT_ROUTE,
  ORCHESTRATOR_CLUSTER_ID,
  ORCHESTRATOR_RESOURCE_ID,
  ORCHESTRATOR_NAMESPACE,
  ORCHESTRATOR_CLUSTER_NAME,
  CONTAINER_IMAGE_NAME,
  CLOUD_INSTANCE_NAME,
  ENTRY_LEADER_ENTITY_ID,
} from '../../common/constants';

export const registerCountRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: COUNT_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            requiredPrivileges: ['securitySolution'],
          },
        },
        validate: {
          request: {
            query: schema.object({
              index: schema.string(),
              query: schema.string(),
              field: schema.oneOf([
                schema.literal(ORCHESTRATOR_CLUSTER_ID),
                schema.literal(ORCHESTRATOR_RESOURCE_ID),
                schema.literal(ORCHESTRATOR_NAMESPACE),
                schema.literal(ORCHESTRATOR_CLUSTER_NAME),
                schema.literal(CLOUD_INSTANCE_NAME),
                schema.literal(CONTAINER_IMAGE_NAME),
                schema.literal(CONTAINER_IMAGE_NAME),
                schema.literal(ENTRY_LEADER_ENTITY_ID),
              ]),
            }),
          },
        },
      },
      async (context, request, response) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const { query, field, index } = request.query;

        try {
          const body = await doCount(client, index, query, field);

          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Failed to fetch k8s counts: ${err}`);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};

export const doCount = async (
  client: ElasticsearchClient,
  index: string,
  query: string,
  field: string
) => {
  const queryDSL = JSON.parse(query);

  const search = await client.search({
    index: [index],
    body: {
      query: queryDSL,
      size: 0,
      aggs: {
        custom_count: {
          cardinality: {
            field,
          },
        },
      },
    },
  });

  const agg: any = search.aggregations?.custom_count;

  return agg?.value || 0;
};
