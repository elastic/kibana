/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { WATCH_TYPES } from '../../../../common/constants';
import { serializeJsonWatch, serializeThresholdWatch } from '../../../../common/lib/serialization';
import { RouteDependencies } from '../../../types';

const paramsSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object(
  {
    type: schema.string(),
    isNew: schema.boolean(),
    isActive: schema.boolean(),
  },
  { unknowns: 'allow' }
);

export function registerSaveRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: '/api/watcher/watch/{id}',
      validate: {
        params: paramsSchema,
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const { id } = request.params;
      const { type, isNew, isActive, ...watchConfig } = request.body;

      const dataClient = ctx.core.elasticsearch.client;

      // For new watches, verify watch with the same ID doesn't already exist
      if (isNew) {
        try {
          const existingWatch = await dataClient.asCurrentUser.watcher.getWatch({
            id,
          });
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
          const es404 = e?.statusCode === 404;
          if (!es404) {
            throw e;
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
        const putResult = await dataClient.asCurrentUser.watcher.putWatch({
          id,
          active: isActive,
          body: serializedWatch,
        });
        return response.ok({
          body: putResult,
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
