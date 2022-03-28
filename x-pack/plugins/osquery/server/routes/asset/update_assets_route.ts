/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { filter, omit } from 'lodash';
import { schema } from '@kbn/config-schema';
import { asyncForEach } from '@kbn/std';
import deepmerge from 'deepmerge';

import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import { combineMerge } from './utils';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertSOQueriesToPack, convertPackQueriesToSO } from '../pack/utils';
import { KibanaAssetReference } from '../../../../fleet/common';
import { PackSavedObjectAttributes } from '../../common/types';

export const updateAssetsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/assets/update',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;
      const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

      let installation;

      try {
        installation = await osqueryContext.service
          .getPackageService()
          ?.asInternalUser?.getInstallation(OSQUERY_INTEGRATION_NAME);
      } catch (err) {
        return response.notFound();
      }

      if (installation) {
        const installationPackAssets = filter(installation.installed_kibana, [
          'type',
          packAssetSavedObjectType,
        ]);

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

        await Promise.all([
          ...install.map(async (installationPackAsset) => {
            const packAssetSavedObject = await savedObjectsClient.get<PackSavedObjectAttributes>(
              installationPackAsset.type,
              installationPackAsset.id
            );

            const conflictingEntries = await savedObjectsClient.find({
              type: packSavedObjectType,
              filter: `${packSavedObjectType}.attributes.name: "${packAssetSavedObject.attributes.name}"`,
            });

            const name = conflictingEntries.saved_objects.length
              ? `${packAssetSavedObject.attributes.name}-elastic`
              : packAssetSavedObject.attributes.name;

            await savedObjectsClient.create(
              packSavedObjectType,
              {
                name,
                description: packAssetSavedObject.attributes.description,
                queries: packAssetSavedObject.attributes.queries,
                enabled: false,
                created_at: moment().toISOString(),
                created_by: currentUser,
                updated_at: moment().toISOString(),
                updated_by: currentUser,
                version: packAssetSavedObject.attributes.version ?? 1,
              },
              {
                references: [
                  ...packAssetSavedObject.references,
                  {
                    type: packAssetSavedObject.type,
                    id: packAssetSavedObject.id,
                    name: packAssetSavedObject.attributes.name,
                  },
                ],
                refresh: 'wait_for',
              }
            );
          }),
          ...update.map(async (updatePackAsset) => {
            const packAssetSavedObject = await savedObjectsClient.get<PackSavedObjectAttributes>(
              updatePackAsset.type,
              updatePackAsset.id
            );

            const packSavedObjectsResponse =
              await savedObjectsClient.find<PackSavedObjectAttributes>({
                type: 'osquery-pack',
                hasReference: {
                  type: updatePackAsset.type,
                  id: updatePackAsset.id,
                },
              });

            if (packSavedObjectsResponse.total) {
              await savedObjectsClient.update(
                packSavedObjectsResponse.saved_objects[0].type,
                packSavedObjectsResponse.saved_objects[0].id,
                deepmerge.all([
                  omit(packSavedObjectsResponse.saved_objects[0].attributes, 'queries'),
                  omit(packAssetSavedObject.attributes, 'queries'),
                  {
                    updated_at: moment().toISOString(),
                    updated_by: currentUser,
                    queries: convertPackQueriesToSO(
                      deepmerge(
                        convertSOQueriesToPack(
                          packSavedObjectsResponse.saved_objects[0].attributes.queries
                        ),
                        convertSOQueriesToPack(packAssetSavedObject.attributes.queries),
                        {
                          arrayMerge: combineMerge,
                        }
                      )
                    ),
                  },
                  {
                    arrayMerge: combineMerge,
                  },
                ]),
                { refresh: 'wait_for' }
              );
            }
          }),
        ]);

        return response.ok({
          body: {
            install,
            update,
            upToDate,
          },
        });
      }

      return response.ok({
        body: {
          install: 0,
          update: 0,
          upToDate: 0,
        },
      });
    }
  );
};
