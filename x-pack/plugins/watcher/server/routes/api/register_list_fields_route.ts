/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { isEsError } from '../../shared_imports';
// @ts-ignore
import { Fields } from '../../models/fields/index';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { RouteDependencies } from '../../types';

const bodySchema = schema.object({
  indexes: schema.arrayOf(schema.string()),
});

function fetchFields(dataClient: ILegacyScopedClusterClient, indexes: string[]) {
  const params = {
    index: indexes,
    fields: ['*'],
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: 404,
  };

  return dataClient.callAsCurrentUser('fieldCaps', params);
}

export function registerListFieldsRoute(deps: RouteDependencies) {
  deps.router.post(
    {
      path: '/api/watcher/fields',
      validate: {
        body: bodySchema,
      },
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      const { indexes } = request.body;

      try {
        const fieldsResponse = await fetchFields(ctx.watcher!.client, indexes);
        const json = fieldsResponse.status === 404 ? { fields: [] } : fieldsResponse;
        const fields = Fields.fromUpstreamJson(json);
        return response.ok({ body: fields.downstreamJson });
      } catch (e) {
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          return response.customError({
            statusCode: e.statusCode,
            body: {
              message: e.message,
            },
          });
        }

        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
