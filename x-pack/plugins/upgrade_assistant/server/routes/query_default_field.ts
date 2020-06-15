/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { addDefaultField } from '../lib/query_default_field';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

/**
 * Adds routes for detecting and fixing 6.x Metricbeat indices that need the
 * `index.query.default_field` index setting added.
 *
 * @param server
 */
export function registerQueryDefaultFieldRoutes({ router }: RouteDependencies) {
  router.post(
    {
      path: '/api/upgrade_assistant/add_query_default_field/{indexName}',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        body: schema.object({
          fieldTypes: schema.arrayOf(schema.string()),
          otherFields: schema.arrayOf(schema.string(), { defaultValue: undefined }),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: {
              legacy: { client },
            },
          },
        },
        request,
        response
      ) => {
        try {
          const { indexName } = request.params;
          const { fieldTypes, otherFields } = request.body as {
            fieldTypes: string[];
            otherFields?: string[];
          };

          return response.ok({
            body: await addDefaultField(
              client,
              indexName,
              new Set(fieldTypes),
              otherFields ? new Set(otherFields) : undefined
            ),
          });
        } catch (e) {
          const status = e.status || e.statusCode;
          if (status === 403) {
            return response.forbidden({ body: e });
          }

          return response.internalError({ body: e });
        }
      }
    )
  );
}
