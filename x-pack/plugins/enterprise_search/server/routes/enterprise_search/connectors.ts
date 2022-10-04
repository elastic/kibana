/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { i18n } from '@kbn/i18n';

import { ConnectorStatus } from '../../../common/types/connectors';

import { ErrorCode } from '../../../common/types/error_codes';
import { addConnector } from '../../lib/connectors/add_connector';
import { fetchSyncJobsByConnectorId } from '../../lib/connectors/fetch_sync_jobs';
import { startConnectorSync } from '../../lib/connectors/start_sync';
import { updateConnectorConfiguration } from '../../lib/connectors/update_connector_configuration';
import { updateConnectorNameAndDescription } from '../../lib/connectors/update_connector_name_and_description';
import { updateConnectorScheduling } from '../../lib/connectors/update_connector_scheduling';
import { updateConnectorServiceType } from '../../lib/connectors/update_connector_service_type';
import { updateConnectorStatus } from '../../lib/connectors/update_connector_status';
import { getDefaultPipeline } from '../../lib/pipelines/get_default_pipeline';
import { updateDefaultPipeline } from '../../lib/pipelines/update_default_pipeline';
import { updateConnectorPipeline } from '../../lib/pipelines/update_pipeline';

import { RouteDependencies } from '../../plugin';
import { createError } from '../../utils/create_error';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerConnectorRoutes({ router, log }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/connectors',
      validate: {
        body: schema.object({
          delete_existing_connector: schema.maybe(schema.boolean()),
          index_name: schema.string(),
          is_native: schema.boolean(),
          language: schema.nullable(schema.string()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const body = await addConnector(client, request.body);
        return response.ok({ body });
      } catch (error) {
        if (
          (error as Error).message === ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS ||
          (error as Error).message === ErrorCode.INDEX_ALREADY_EXISTS
        ) {
          return createError({
            errorCode: (error as Error).message as ErrorCode,
            message: i18n.translate(
              'xpack.enterpriseSearch.server.routes.addConnector.connectorExistsError',
              {
                defaultMessage: 'Connector or index already exists',
              }
            ),
            response,
            statusCode: 409,
          });
        }

        throw error;
      }
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/configuration',
      validate: {
        body: schema.recordOf(
          schema.string(),
          schema.object({ label: schema.string(), value: schema.string() })
        ),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await updateConnectorConfiguration(client, request.params.connectorId, request.body);
      return response.ok();
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/scheduling',
      validate: {
        body: schema.object({ enabled: schema.boolean(), interval: schema.string() }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await updateConnectorScheduling(client, request.params.connectorId, request.body);
      return response.ok();
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/start_sync',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
        body: schema.object({
          nextSyncConfig: schema.maybe(schema.string()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await startConnectorSync(client, request.params.connectorId, request.body.nextSyncConfig);
      return response.ok();
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/sync_jobs',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
        query: schema.object({
          page: schema.number({ defaultValue: 0, min: 0 }),
          size: schema.number({ defaultValue: 10, min: 0 }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await fetchSyncJobsByConnectorId(
        client,
        request.params.connectorId,
        request.query.page,
        request.query.size
      );
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/pipeline',
      validate: {
        body: schema.object({
          extract_binary_content: schema.boolean(),
          name: schema.string(),
          reduce_whitespace: schema.boolean(),
          run_ml_inference: schema.boolean(),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      await updateConnectorPipeline(client, request.params.connectorId, request.body);
      return response.ok();
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/connectors/default_pipeline',
      validate: {
        body: schema.object({
          extract_binary_content: schema.boolean(),
          name: schema.string(),
          reduce_whitespace: schema.boolean(),
          run_ml_inference: schema.boolean(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await updateDefaultPipeline(client, request.body);
      return response.ok();
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/connectors/default_pipeline',
      validate: {},
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await getDefaultPipeline(client);
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/service_type',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
        body: schema.object({ serviceType: schema.string() }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await updateConnectorServiceType(
        client,
        request.params.connectorId,
        request.body.serviceType
      );
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/status',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
        body: schema.object({ status: schema.string() }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await updateConnectorStatus(
        client,
        request.params.connectorId,
        request.body.status as ConnectorStatus
      );
      return response.ok({ body: result });
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/name_and_description',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
        body: schema.object({
          name: schema.string(),
          description: schema.nullable(schema.string()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { name, description } = request.body;
      const result = await updateConnectorNameAndDescription(client, request.params.connectorId, {
        description,
        name,
      });
      return response.ok({ body: result });
    })
  );
}
