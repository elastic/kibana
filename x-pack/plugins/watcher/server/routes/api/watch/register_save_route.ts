/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { WATCH_TYPES } from '../../../../common/constants';
import { serializeJsonWatch, serializeThresholdWatch } from '../../../../common/lib/serialization';
import { isEsError } from '../../../lib/is_es_error';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

const paramsSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object(
  {
    type: schema.string(),
    isNew: schema.boolean(),
  },
  { allowUnknowns: true }
);

function fetchWatch(dataClient: IScopedClusterClient, watchId: string) {
  return dataClient.callAsCurrentUser('watcher.getWatch', {
    id: watchId,
  });
}

function saveWatch(dataClient: IScopedClusterClient, id: string, body: any) {
  return dataClient.callAsCurrentUser('watcher.putWatch', {
    id,
    body,
  });
}

export function registerSaveRoute(deps: RouteDependencies) {
  deps.router.put(
    {
      path: '/api/watcher/watch/{id}',
      validate: {
        params: paramsSchema,
        body: bodySchema,
      },
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      const { id } = request.params;
      const { type, isNew, ...watchConfig } = request.body;

      // For new watches, verify watch with the same ID doesn't already exist
      if (isNew) {
        try {
          const existingWatch = await fetchWatch(ctx.watcher!.client, id);
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
          const { name, watch } = watchConfig as any;
          serializedWatch = serializeJsonWatch(name, watch);
          break;

        case WATCH_TYPES.THRESHOLD:
          serializedWatch = serializeThresholdWatch(watchConfig);
          break;
      }

      try {
        // Create new watch
        return response.ok({
          body: await saveWatch(ctx.watcher!.client, id, serializedWatch),
        });
      } catch (e) {
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          return response.customError({ statusCode: e.statusCode, body: e });
        }

        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
