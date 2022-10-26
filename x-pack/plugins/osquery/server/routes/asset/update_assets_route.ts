/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import {
  filter,
  omit,
  some,
  every,
  find,
  pick,
  map,
  mapKeys,
  uniq,
  uniqWith,
  isEqual,
} from 'lodash';
import deepmerge from 'deepmerge';
import { schema } from '@kbn/config-schema';
import { asyncForEach } from '@kbn/std';
import type { IRouter, SavedObject } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';
import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import { combineMerge } from './utils';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertSOQueriesToPack, convertPackQueriesToSO } from '../pack/utils';
import type { PackSavedObjectAttributes } from '../../common/types';
import { copySavedObjectsToSpacesFactory } from '../../utils/copy_to_spaces';

export const updateAssetsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/assets/update',
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
              const assetSavedObject = await savedObjectsClient.get<{ version: number }>(
                installationAsset.type,
                installationAsset.id
              );

              if (assetSavedObject) {
                if (
                  !assetSavedObject.attributes.version ||
                  !isInstalled.saved_objects[0].attributes.version
                ) {
                  install.push(installationAsset);
                } else if (
                  assetSavedObject.attributes.version >
                    isInstalled.saved_objects[0].attributes.version ||
                  !every(assetSavedObject.references, (reference) =>
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

        const spaceId = osqueryContext.service.getSpacesService()?.getSpaceId(request);

        if (spaceId && spaceId !== 'default') {
          const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
            coreStart.savedObjects,
            request
          );

          await copySavedObjectsToSpaces('default', [spaceId], {
            objects: [...install, ...update],
            overwrite: true,
            includeReferences: true,
            createNewCopies: false,
          });
        }

        await Promise.all([
          ...filter(install, (asset) => asset.type === packAssetSavedObjectType).map(
            async (installationAsset) => {
              const assetSavedObject = await savedObjectsClient.get<PackSavedObjectAttributes>(
                installationAsset.type,
                installationAsset.id
              );

              const conflictingEntries = await savedObjectsClient.find({
                type: packSavedObjectType,
                filter: `${packSavedObjectType}.attributes.name: "${assetSavedObject.attributes.name}"`,
              });

              const name =
                conflictingEntries.saved_objects.length &&
                some(conflictingEntries.saved_objects, [
                  'attributes.name',
                  assetSavedObject.attributes.name,
                ])
                  ? `${assetSavedObject.attributes.name}-elastic`
                  : assetSavedObject.attributes.name;

              let assetSavedObjectReferences;

              if (spaceId === 'default') {
                assetSavedObjectReferences = await savedObjectsClient.bulkGet(
                  assetSavedObject.references
                );
              } else {
                assetSavedObjectReferences = await savedObjectsClient.find({
                  type: uniq(map(assetSavedObject.references, 'type')),
                  search: map(assetSavedObject.references, 'id').join(' '),
                  rootSearchFields: ['originId'],
                });
              }

              const assetSavedObjectReferencesMap = mapKeys(
                assetSavedObjectReferences.saved_objects,
                spaceId === 'default' ? 'id' : 'originId'
              );

              await savedObjectsClient.create(
                packSavedObjectType,
                {
                  name,
                  description: assetSavedObject.attributes.description,
                  queries: assetSavedObject.attributes.queries,
                  enabled: false,
                  created_at: moment().toISOString(),
                  created_by: currentUser,
                  updated_at: moment().toISOString(),
                  updated_by: currentUser,
                  version: assetSavedObject.attributes.version ?? 1,
                },
                {
                  references: uniqWith(
                    [
                      {
                        type: assetSavedObject.type,
                        id: assetSavedObject.id,
                        name: assetSavedObject.attributes.name,
                      },
                      ...map(assetSavedObject.references, (reference) => ({
                        type: reference.type,
                        id: assetSavedObjectReferencesMap[reference.id].id,
                        name: reference.name,
                      })),
                    ],
                    isEqual
                  ),
                  refresh: 'wait_for',
                }
              );
            }
          ),
          ...filter(update, (asset) => asset.type === packAssetSavedObjectType).map(
            async (updatePackAsset) => {
              const assetSavedObject = await savedObjectsClient.get<PackSavedObjectAttributes>(
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
                let assetSavedObjectReferences;

                if (spaceId === 'default') {
                  assetSavedObjectReferences = await savedObjectsClient.bulkGet(
                    assetSavedObject.references
                  );
                } else {
                  assetSavedObjectReferences = await savedObjectsClient.find({
                    type: uniq(map(assetSavedObject.references, 'type')),
                    search: map(assetSavedObject.references, 'id').join(' '),
                    rootSearchFields: ['originId'],
                  });
                }

                const assetSavedObjectReferencesMap = mapKeys(
                  assetSavedObjectReferences.saved_objects,
                  spaceId === 'default' ? 'id' : 'originId'
                );

                await savedObjectsClient.update(
                  packSavedObjectsResponse.saved_objects[0].type,
                  packSavedObjectsResponse.saved_objects[0].id,
                  deepmerge.all([
                    omit(packSavedObjectsResponse.saved_objects[0].attributes, 'queries'),
                    omit(assetSavedObject.attributes, 'queries'),
                    {
                      updated_at: moment().toISOString(),
                      updated_by: currentUser,
                      queries: convertPackQueriesToSO(
                        deepmerge(
                          convertSOQueriesToPack(
                            packSavedObjectsResponse.saved_objects[0].attributes.queries
                          ),
                          convertSOQueriesToPack(assetSavedObject.attributes.queries),
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
                  {
                    references: uniqWith(
                      [
                        ...packSavedObjectsResponse.saved_objects[0].references,
                        ...map(assetSavedObject.references, (reference) => ({
                          type: reference.type,
                          id: assetSavedObjectReferencesMap[reference.id].id,
                          name: reference.name,
                        })),
                      ],
                      isEqual
                    ),
                    refresh: 'wait_for',
                  }
                );
              }
            }
          ),
        ]);

        return response.ok({
          body: {
            installed: install,
            updated: update,
            upToDate,
          },
        });
      }

      return response.ok({
        body: {
          installed: 0,
          updated: 0,
          upToDate: 0,
        },
      });
    }
  );
};
