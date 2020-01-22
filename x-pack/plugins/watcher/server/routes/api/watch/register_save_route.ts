/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { WATCH_TYPES } from '../../../../common/constants';
import { serializeJsonWatch, serializeThresholdWatch } from '../../../../common/lib/serialization';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function fetchWatch(callWithRequest: any, watchId: string) {
  return callWithRequest('watcher.getWatch', {
    id: watchId,
  });
}

function saveWatch(callWithRequest: any, id: string, body: any) {
  return callWithRequest('watcher.putWatch', {
    id,
    body,
  });
}

export function registerSaveRoute(deps: RouteDependencies) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
    const { id } = request.params;
    const { type, isNew, ...watchConfig } = request.body;

    // For new watches, verify watch with the same ID doesn't already exist
    if (isNew) {
      try {
        const existingWatch = await fetchWatch(callWithRequest, id);
        if (existingWatch.found) {
          return response.conflict({
            body: {
              message: i18n.translate('xpack.watcher.saveRoute.duplicateWatchIdErrorMessage', {
                defaultMessage: "There is already a watch with ID '{watchId}'.",
                values: {
                  watchId: id,
                },
              }),
            },
          });
        }
      } catch (e) {
        const es404 = isEsError(e) && e.statusCode === 404;
        if (!es404) {
          return response.internalError({ body: e });
        }
        // Else continue...
      }
    }

    let serializedWatch;

    switch (type) {
      case WATCH_TYPES.JSON:
        const { name, watch } = watchConfig;
        serializedWatch = serializeJsonWatch(name, watch);
        break;

      case WATCH_TYPES.THRESHOLD:
        serializedWatch = serializeThresholdWatch(watchConfig);
        break;
    }

    try {
      // Create new watch
      return response.ok({
        body: await saveWatch(callWithRequest, id, serializedWatch),
      });
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        return response.customError({ statusCode: e.statusCode, body: e });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };

  deps.router.put(
    {
      path: '/api/watcher/watch/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({}, { allowUnknowns: true }),
      },
    },
    licensePreRoutingFactory(deps, handler)
  );
}
