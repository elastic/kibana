/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
// @ts-ignore
import { Fields } from '../../models/fields/index';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { RouteDependencies } from '../../types';

const bodySchema = schema.object({
  indexes: schema.arrayOf(schema.string()),
});

function fetchFields(dataClient: IScopedClusterClient, indexes: string[]) {
  const params = {
    index: indexes,
    fields: ['*'],
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: 404,
  };

  return dataClient.asCurrentUser.fieldCaps(params);
}

export function registerListFieldsRoute({
  router,
  lib: { handleEsError },
  getLicenseStatus,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/watcher/fields',
      validate: {
        body: bodySchema,
      },
    },
    licensePreRoutingFactory(getLicenseStatus, async (ctx, request, response) => {
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
