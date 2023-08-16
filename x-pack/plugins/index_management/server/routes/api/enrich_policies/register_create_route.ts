/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';
import { enrichPoliciesActions } from '../../../lib/enrich_policies';
import { serializeAsESPolicy } from '../../../lib/enrich_policies';
import type { SerializedEnrichPolicy } from '../../../../common';

export const validationSchema = schema.object({
  name: schema.string(),
  type: schema.oneOf([
    schema.literal('match'),
    schema.literal('range'),
    schema.literal('geo_match'),
  ]),
  matchField: schema.string(),
  enrichFields: schema.arrayOf(schema.string()),
  sourceIndices: schema.arrayOf(schema.string()),
  query: schema.maybe(schema.any()),
});

export function registerCreateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    { path: addBasePath('/enrich_policies'), validate: { body: validationSchema } },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;

      const { name } = request.body;
      const serializedPolicy = serializeAsESPolicy(request.body as SerializedEnrichPolicy);

      try {
        const res = await enrichPoliciesActions.create(client, name, serializedPolicy);
        return response.ok({ body: res });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
