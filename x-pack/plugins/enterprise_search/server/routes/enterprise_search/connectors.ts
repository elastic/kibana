/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { addConnector } from '../../lib/connectors/add_connector';
import { updateConnectorConfiguration } from '../../lib/connectors/update_connector_configuration';

import { RouteDependencies } from '../../plugin';

export function registerConnectorRoutes({ router }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/connectors',
      validate: {
        body: schema.object({
          index_name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const body = await addConnector(client, request.body);
        return response.ok({ body });
      } catch (error) {
        return response.customError({
          body: i18n.translate('xpack.enterpriseSearch.server.routes.addConnector.error', {
            defaultMessage: 'Error fetching data from Enterprise Search',
          }),
          statusCode: 502,
        });
      }
    }
  );
  router.post(
    {
      path: '/internal/enterprise_search/connectors/{indexId}/configuration',
      validate: {
        body: schema.recordOf(
          schema.string(),
          schema.object({ label: schema.string(), value: schema.nullable(schema.string()) })
        ),
        params: schema.object({
          indexId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        await updateConnectorConfiguration(client, request.params.indexId, request.body);
        return response.ok();
      } catch (error) {
        return response.customError({
          body: i18n.translate('xpack.enterpriseSearch.server.routes.updateConnector.error', {
            defaultMessage: 'Error fetching data from Enterprise Search',
          }),
          statusCode: 502,
        });
      }
    }
  );
}
