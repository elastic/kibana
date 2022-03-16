/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerClusterSettingsRoute({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    {
      path: `${API_BASE_PATH}/cluster_settings`,
      validate: {
        body: schema.object({
          settings: schema.arrayOf(schema.string()),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const { settings } = request.body;

          // We need to fetch the current cluster settings in order to determine
          // if the settings to delete were set as transient or persistent settings
          const currentClusterSettings = await client.asCurrentUser.cluster.getSettings({
            flat_settings: true,
          });

          const settingsToDelete = settings.reduce(
            (settingsBody, currentSetting) => {
              if (
                Object.keys(currentClusterSettings.persistent).find((key) => key === currentSetting)
              ) {
                settingsBody.persistent[currentSetting] = null;
              }

              if (
                Object.keys(currentClusterSettings.transient).find((key) => key === currentSetting)
              ) {
                settingsBody.transient[currentSetting] = null;
              }

              return settingsBody;
            },
            { persistent: {}, transient: {} } as {
              persistent: { [key: string]: null };
              transient: { [key: string]: null };
            }
          );

          const settingsResponse = await client.asCurrentUser.cluster.putSettings({
            body: settingsToDelete,
            flat_settings: true,
          });

          return response.ok({
            body: settingsResponse,
          });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );
}
