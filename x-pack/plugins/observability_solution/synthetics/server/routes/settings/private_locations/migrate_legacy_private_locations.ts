/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-server';
import {
  type PrivateLocationAttributes,
  SyntheticsPrivateLocationsAttributes,
} from '../../../runtime_types/private_locations';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
  privateLocationSavedObjectName,
} from '../../../../common/saved_objects/private_locations';
import { RouteContext } from '../../types';

export const migrateLegacyPrivateLocations = async ({
  server,
  savedObjectsClient,
}: RouteContext) => {
  try {
    let obj: SavedObject<SyntheticsPrivateLocationsAttributes> | undefined;
    try {
      obj = await savedObjectsClient.get<SyntheticsPrivateLocationsAttributes>(
        legacyPrivateLocationsSavedObjectName,
        legacyPrivateLocationsSavedObjectId
      );
    } catch (e) {
      server.logger.error(`Error getting legacy private locations: ${e}`);
      return;
    }
    const legacyLocations = obj?.attributes.locations ?? [];
    if (legacyLocations.length === 0) {
      return;
    }

    const soClient = server.coreStart.savedObjects.createInternalRepository();

    await soClient.bulkCreate<PrivateLocationAttributes>(
      legacyLocations.map((location) => ({
        id: location.id,
        attributes: location,
        type: privateLocationSavedObjectName,
        initialNamespaces: ['*'],
      })),
      {
        overwrite: true,
      }
    );

    const { total } = await savedObjectsClient.find<PrivateLocationAttributes>({
      type: privateLocationSavedObjectName,
      fields: [],
      perPage: 0,
    });

    if (total === legacyLocations.length) {
      await savedObjectsClient.delete(
        legacyPrivateLocationsSavedObjectName,
        legacyPrivateLocationsSavedObjectId,
        {}
      );
    }
  } catch (e) {
    server.logger.error(`Error migrating legacy private locations: ${e}`);
  }
};
