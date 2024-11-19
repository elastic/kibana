/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const bodySchema = schema.object({}, { unknowns: 'allow' });

export function registerSimulateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/index_templates/simulate/{templateName?}'),
      validate: {
        body: schema.nullable(bodySchema),
        params: schema.object({ templateName: schema.maybe(schema.string()) }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const template = request.body as TypeOf<typeof bodySchema>;
      // Until ES fixes a bug on their side we need to send a fake index pattern
      // that won't match any indices.
      // Issue: https://github.com/elastic/elasticsearch/issues/59152
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const index_patterns = ['a_fake_index_pattern_that_wont_match_any_indices'];
      const templateName = request.params.templateName;

      const params: estypes.IndicesSimulateTemplateRequest = templateName
        ? {
            name: templateName,
            body: {
              index_patterns,
            },
          }
        : {
            body: {
              ...template,
              index_patterns,
            },
          };

      try {
        const templatePreview = await client.asCurrentUser.indices.simulateTemplate(params);

        return response.ok({ body: templatePreview });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
