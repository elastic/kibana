/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { METRICS_APP_ID } from '@kbn/deeplinks-observability/constants';
import { SOURCE_DATA_STREAM_TYPE } from '@kbn/observability-shared-plugin/common/field_names/elasticsearch';
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getLatestEntity } from './get_latest_entity';

export const initEntitiesConfigurationRoutes = (libs: InfraBackendLibs) => {
  const { framework, logger } = libs;

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/infra/entities/{entityType}/{entityId}/summary',
      validate: {
        params: schema.object({
          entityType: schema.oneOf([schema.literal('host'), schema.literal('container')]),
          entityId: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (requestContext, request, response) => {
      const { entityId, entityType } = request.params;
      const coreContext = await requestContext.core;
      const infraContext = await requestContext.infra;
      const entityManager = await infraContext.entityManager.getScopedClient({ request });

      const client = createObservabilityEsClient({
        client: coreContext.elasticsearch.client.asCurrentUser,
        logger,
        plugin: `@kbn/${METRICS_APP_ID}-plugin`,
      });

      try {
        // Only fetch built in definitions
        const { definitions } = await entityManager.getEntityDefinitions({
          builtIn: true,
          type: entityType,
        });
        if (definitions.length === 0) {
          return response.ok({
            body: { sourceDataStreams: [], entityId, entityType },
          });
        }

        const entity = await getLatestEntity({
          inventoryEsClient: client,
          entityId,
          entityType,
          entityDefinitions: definitions,
        });

        return response.ok({
          body: {
            sourceDataStreams: [entity?.[SOURCE_DATA_STREAM_TYPE] || []].flat() as string[],
            entityId,
            entityType,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};
