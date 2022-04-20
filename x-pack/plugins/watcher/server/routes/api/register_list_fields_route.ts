/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';
// @ts-ignore
import { Fields } from '../../models/fields';
import { RouteDependencies } from '../../types';

const bodySchema = schema.object({
  indexes: schema.arrayOf(schema.string()),
});

function fetchFields(dataClient: IScopedClusterClient, indexes: string[]) {
  return dataClient.asCurrentUser.fieldCaps(
    {
      index: indexes,
      fields: ['*'],
      allow_no_indices: true,
      ignore_unavailable: true,
    },
    { ignore: [404], meta: true }
  );
}

export function registerListFieldsRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    {
      path: '/api/watcher/fields',
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const { indexes } = request.body;

      try {
        const fieldsResponse = await fetchFields(ctx.core.elasticsearch.client, indexes);
        const json = fieldsResponse.statusCode === 404 ? { fields: [] } : fieldsResponse.body;
        const fields = Fields.fromUpstreamJson(json);
        return response.ok({ body: fields.downstreamJson });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
