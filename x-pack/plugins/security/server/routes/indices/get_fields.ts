/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../index';
import { wrapIntoCustomErrorResponse } from '../../errors';

interface FieldMappingResponse {
  [indexName: string]: {
    mappings: {
      [fieldName: string]: {
        mapping: {
          [fieldName: string]: {
            type: string;
          };
        };
      };
    };
  };
}

export function defineGetFieldsRoutes({ router }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/fields/{query}',
      validate: { params: schema.object({ query: schema.string() }) },
    },
    async (context, request, response) => {
      try {
        const {
          body: indexMappings,
        } = await context.core.elasticsearch.client.asCurrentUser.indices.getFieldMapping<FieldMappingResponse>(
          {
            index: request.params.query,
            fields: '*',
            allow_no_indices: false,
            include_defaults: true,
          }
        );

        // The flow is the following (see response format at https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-get-field-mapping.html):
        // 1. Iterate over all matched indices.
        // 2. Extract all the field names from the `mappings` field of the particular index.
        // 3. Collect and flatten the list of the field names, omitting any fields without mappings, and any runtime fields
        // 4. Use `Set` to get only unique field names.
        const fields = Array.from(
          new Set(
            Object.values(indexMappings).flatMap((indexMapping) => {
              return Object.keys(indexMapping.mappings).filter((fieldName) => {
                const mappingValues = Object.values(indexMapping.mappings[fieldName].mapping);
                const hasMapping = mappingValues.length > 0;

                const isRuntimeField = hasMapping && mappingValues[0]?.type === 'runtime';

                // fields without mappings are internal fields such as `_routing` and `_index`,
                // and therefore don't make sense as autocomplete suggestions for FLS.

                // Runtime fields are not securable via FLS.
                // Administrators should instead secure access to the fields which derive this information.
                return hasMapping && !isRuntimeField;
              });
            })
          )
        );

        return response.ok({
          body: fields,
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    }
  );
}
