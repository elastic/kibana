/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { SECRUTIY_INTEGRATIONS_FLEET_MANAGED_INDEX_TEMPLATES_URL } from '../../../../../common/constants';

export const getFleetManagedIndexTemplatesRoute = (router: IRouter) => {
  router.versioned
    .get({
      path: SECRUTIY_INTEGRATIONS_FLEET_MANAGED_INDEX_TEMPLATES_URL,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route delegates authorization of the current user to the Elasticsearch index template API.',
          },
        },
        validate: {},
      },
      async (context, _request, response) => {
        const intContext = await context.core;
        try {
          const esClient = intContext.elasticsearch.client.asCurrentUser;

          const indexTemplates = (await esClient.indices.getIndexTemplate()).index_templates;

          const fleetManagedIndexTemplates = indexTemplates
            .filter((t) => t.index_template._meta?.managed_by === 'fleet')
            .map((t) => t.name);

          return response.ok({
            body: fleetManagedIndexTemplates,
          });
        } catch (e) {
          const error = transformError(e);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
