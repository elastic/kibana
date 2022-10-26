/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { every, pick, find } from 'lodash';
import { schema } from '@kbn/config-schema';
import { asyncForEach } from '@kbn/std';
import type { IRouter, SavedObject } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';

import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

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
      const [coreStart] = await osqueryContext.getStartServices();
      const savedObjectsClient = (await context.core).savedObjects.client;
      const internalSOClient = new SavedObjectsClient(
        coreStart.savedObjects.createInternalRepository()
      );

      let installation;

      try {
        installation = await osqueryContext.service
          .getPackageService()
          ?.asInternalUser?.getInstallation(OSQUERY_INTEGRATION_NAME);
      } catch (err) {
        return response.notFound();
      }

      if (installation) {
        const install: KibanaAssetReference[] = [];
        const update: KibanaAssetReference[] = [];
        const upToDate: KibanaAssetReference[] = [];

        await asyncForEach(installation.installed_kibana, async (installationAsset) => {
          if (installationAsset.type === packAssetSavedObjectType) {
            const isInstalled = await savedObjectsClient.find<{ version: number }>({
              type: packSavedObjectType,
              hasReference: {
                type: installationAsset.type,
                id: installationAsset.id,
              },
            });

            if (!isInstalled.total) {
              install.push(installationAsset);
            }

            if (isInstalled.total) {
              const packAssetSavedObject = await savedObjectsClient.get<{ version: number }>(
                installationAsset.type,
                installationAsset.id
              );

              if (packAssetSavedObject) {
                if (
                  !packAssetSavedObject.attributes.version ||
                  !isInstalled.saved_objects[0].attributes.version
                ) {
                  install.push(installationAsset);
                } else if (
                  packAssetSavedObject.attributes.version >
                    isInstalled.saved_objects[0].attributes.version ||
                  !every(packAssetSavedObject.references, (reference) =>
                    find(isInstalled.saved_objects[0].references, pick(reference, ['type', 'name']))
                  )
                ) {
                  update.push(installationAsset);
                } else {
                  upToDate.push(installationAsset);
                }
              }
            }
          } else {
            let isInstalled: SavedObject<{ updated_at?: string; version?: number }> | undefined;

            try {
              const spaceId = osqueryContext.service.getSpacesService()?.getSpaceId(request);

              if (spaceId !== 'default') {
                const results = await savedObjectsClient.find<{
                  updated_at?: string;
                  version?: number;
                }>({
                  type: installationAsset.type,
                  search: installationAsset.id,
                  rootSearchFields: ['originId'],
                });
                if (results.total) {
                  isInstalled = results.saved_objects[0];
                }
              } else {
                isInstalled = await savedObjectsClient.get(
                  installationAsset.type,
                  installationAsset.id
                );
              }

              if (isInstalled) {
                const originalAsset = await internalSOClient.get<{
                  updated_at?: string;
                  version?: number;
                }>(installationAsset.type, installationAsset.id);

                if (
                  (isInstalled.attributes?.updated_at &&
                    isInstalled.attributes?.updated_at !== originalAsset.attributes?.updated_at) ||
                  (isInstalled.attributes?.version &&
                    isInstalled.attributes?.version !== originalAsset.attributes?.version)
                ) {
                  update.push(installationAsset);
                } else {
                  upToDate.push(installationAsset);
                }
              } else {
                install.push(installationAsset);
              }
            } catch (e) {
              install.push(installationAsset);
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
