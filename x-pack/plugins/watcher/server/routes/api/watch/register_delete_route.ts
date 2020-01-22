/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function deleteWatch(callWithRequest: any, watchId: string) {
  return callWithRequest('watcher.deleteWatch', {
    id: watchId,
  });
}

export function registerDeleteRoute(deps: RouteDependencies) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);

    const { watchId } = request.params;

    try {
      return response.ok({
        body: await deleteWatch(callWithRequest, watchId),
      });
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        const body = e.statusCode === 404 ? `Watch with id = ${watchId} not found` : e;
        return response.customError({ statusCode: e.statusCode, body });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };

  deps.router.delete(
    {
      path: '/api/watcher/watch/{watchId}',
      validate: {
        params: schema.object({
          watchId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(deps, handler)
  );
}
