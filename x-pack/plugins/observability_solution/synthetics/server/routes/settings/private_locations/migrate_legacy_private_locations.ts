/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { SavedObject } from '@kbn/core-saved-objects-server';
import {
  type PrivateLocationAttributes,
  SyntheticsPrivateLocationsAttributes,
} from '../../../runtime_types/private_locations';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
  privateLocationsSavedObjectName,
} from '../../../../common/saved_objects/private_locations';
import { RouteContext } from '../../types';

export const migrateLegacyPrivateLocations = async ({
  server,
  request,
  savedObjectsClient,
}: RouteContext) => {
  try {
    const { coreStart } = server;
    const canSave =
      (
        await coreStart?.capabilities.resolveCapabilities(request, {
          capabilityPath: 'uptime.*',
        })
      ).uptime.save ?? false;

    if (canSave) {
      let obj: SavedObject<SyntheticsPrivateLocationsAttributes> | undefined;
      try {
        obj = await savedObjectsClient.get<SyntheticsPrivateLocationsAttributes>(
          legacyPrivateLocationsSavedObjectName,
          legacyPrivateLocationsSavedObjectId
        );
      } catch (e) {
        return;
      }
      const legacyLocations = obj?.attributes.locations ?? [];
      if (legacyLocations.length > 0) {
        await pMap(
          legacyLocations,
          async (location) => {
            await savedObjectsClient.create<PrivateLocationAttributes>(
              privateLocationsSavedObjectName,
              location,
              {
                id: location.id,
                initialNamespaces: ['*'],
                overwrite: true,
              }
            );
          },
          { concurrency: 10 }
        );

        const { total } = await savedObjectsClient.find<PrivateLocationAttributes>({
          type: privateLocationsSavedObjectName,
        });

        if (total === legacyLocations.length) {
          await savedObjectsClient.delete(
            legacyPrivateLocationsSavedObjectName,
            legacyPrivateLocationsSavedObjectId,
            {}
          );
        }
      }
    }
  } catch (e) {
    server.logger.error(`Error migrating legacy private locations: ${e}`);
  }
};
