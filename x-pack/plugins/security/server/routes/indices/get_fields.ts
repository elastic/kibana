/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../index';
import { wrapIntoCustomErrorResponse } from '../../errors';

export function defineGetFieldsRoutes({ router, clusterClient }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/fields/{query}',
      validate: { params: schema.object({ query: schema.string() }) },
    },
    async (context, request, response) => {
      try {
        const indexMappings = (await clusterClient
          .asScoped(request)
          .callAsCurrentUser('indices.getFieldMapping', {
            index: request.params.query,
            fields: '*',
            allowNoIndices: false,
            includeDefaults: true,
          })) as Record<string, { mappings: Record<string, unknown> }>;

        // The flow is the following (see response format at https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-get-field-mapping.html):
        // 1. Iterate over all matched indices.
        // 2. Extract all the field names from the `mappings` field of the particular index.
        // 3. Collect and flatten the list of the field names.
        // 4. Use `Set` to get only unique field names.
        return response.ok({
          body: Array.from(
            new Set(
              Object.values(indexMappings)
                .map(indexMapping => Object.keys(indexMapping.mappings))
                .flat()
            )
          ),
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    }
  );
}
