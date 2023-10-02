/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'lodash/fp';
import { asyncForEach } from '@kbn/std';
import type { IRouter } from '@kbn/core/server';

import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';
import type { GetAssetsStatusRequestParamsSchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getAssetsStatusRequestParamsSchema } from '../../../common/api';

export const getAssetsStatusRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/assets',
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof getAssetsStatusRequestParamsSchema,
              GetAssetsStatusRequestParamsSchema
            >(getAssetsStatusRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const savedObjectsClient = (await context.core).savedObjects.client;

        let installation;

        try {
          installation = await osqueryContext.service
            .getPackageService()
            ?.asInternalUser?.getInstallation(OSQUERY_INTEGRATION_NAME);
        } catch (err) {
          return response.notFound();
        }

        if (installation) {
          const installationPackAssets = filter(
            ['type', packAssetSavedObjectType],
            installation.installed_kibana
          );

          const install: KibanaAssetReference[] = [];
          const update: KibanaAssetReference[] = [];
          const upToDate: KibanaAssetReference[] = [];

          await asyncForEach(installationPackAssets, async (installationPackAsset) => {
            const isInstalled = await savedObjectsClient.find<{ version: number }>({
              type: packSavedObjectType,
              hasReference: {
                type: installationPackAsset.type,
                id: installationPackAsset.id,
              },
            });

            if (!isInstalled.total) {
              install.push(installationPackAsset);
            }

            if (isInstalled.total) {
              const packAssetSavedObject = await savedObjectsClient.get<{ version: number }>(
                installationPackAsset.type,
                installationPackAsset.id
              );

              if (packAssetSavedObject) {
                if (
                  !packAssetSavedObject.attributes.version ||
                  !isInstalled.saved_objects[0].attributes.version
                ) {
                  install.push(installationPackAsset);
                } else if (
                  packAssetSavedObject.attributes.version >
                  isInstalled.saved_objects[0].attributes.version
                ) {
                  update.push(installationPackAsset);
                } else {
                  upToDate.push(installationPackAsset);
                }
              }
            }
          });

          return response.ok({
            body: {
              install,
              update,
              upToDate,
            },
          });
        }

        return response.ok();
      }
    );
};
