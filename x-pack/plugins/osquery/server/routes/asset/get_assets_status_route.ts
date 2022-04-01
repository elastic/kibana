/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'lodash/fp';
import { schema } from '@kbn/config-schema';
import { asyncForEach } from '@kbn/std';
import { IRouter } from 'kibana/server';

import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { KibanaAssetReference } from '../../../../fleet/common';

export const getAssetsStatusRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/assets',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

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
