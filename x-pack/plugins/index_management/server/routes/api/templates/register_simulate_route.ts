/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.object({}, { unknowns: 'allow' });

export function registerSimulateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/index_templates/simulate'),
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const template = request.body as TypeOf<typeof bodySchema>;

      try {
        const { body: templatePreview } = await client.asCurrentUser.indices.simulateTemplate({
          body: {
            ...template,
            // Until ES fixes a bug on their side we need to send a fake index pattern
            // that won't match any indices.
            // Issue: https://github.com/elastic/elasticsearch/issues/59152
            index_patterns: ['a_fake_index_pattern_that_wont_match_any_indices'],
          },
        } as estypes.IndicesSimulateTemplateRequest);

        return response.ok({ body: templatePreview });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
