/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import deepmerge from 'deepmerge';
import { filter, omit, some } from 'lodash';
import moment from 'moment-timezone';

import type { IRouter } from '@kbn/core/server';
import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';
import type { UpdateAssetsStatusRequestParamsSchema } from '../../../common/api';
import { updateAssetsStatusRequestParamsSchema } from '../../../common/api';
import { API_VERSIONS } from '../../../common/constants';
import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import type { PackSavedObject } from '../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { convertPackQueriesToSO, convertSOQueriesToPack } from '../pack/utils';
import { combineMerge } from './utils';

export const updateAssetsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/osquery/assets/update',
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof updateAssetsStatusRequestParamsSchema,
              UpdateAssetsStatusRequestParamsSchema
            >(updateAssetsStatusRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const savedObjectsClient = (await context.core).savedObjects.client;
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
              const packAssetSavedObject = await savedObjectsClient.get<PackSavedObject>(
                installationPackAsset.type,
                installationPackAsset.id
              );

              const conflictingEntries = await savedObjectsClient.find({
                type: packSavedObjectType,
                filter: `${packSavedObjectType}.attributes.name: "${packAssetSavedObject.attributes.name}"`,
              });

              const name =
                conflictingEntries.saved_objects.length &&
                some(conflictingEntries.saved_objects, [
                  'attributes.name',
                  packAssetSavedObject.attributes.name,
                ])
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
              const packAssetSavedObject = await savedObjectsClient.get<PackSavedObject>(
                updatePackAsset.type,
                updatePackAsset.id
              );

              const packSavedObjectsResponse = await savedObjectsClient.find<PackSavedObject>({
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
