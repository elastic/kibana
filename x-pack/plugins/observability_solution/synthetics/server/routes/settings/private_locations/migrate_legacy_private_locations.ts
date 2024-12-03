/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/logging';
import {
  type PrivateLocationAttributes,
  SyntheticsPrivateLocationsAttributes,
} from '../../../runtime_types/private_locations';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
  privateLocationSavedObjectName,
} from '../../../../common/saved_objects/private_locations';

export const migrateLegacyPrivateLocations = async (
  soClient: ISavedObjectsRepository,
  logger: Logger
) => {
  try {
    let obj: SavedObject<SyntheticsPrivateLocationsAttributes> | undefined;
    try {
      obj = await soClient.get<SyntheticsPrivateLocationsAttributes>(
        legacyPrivateLocationsSavedObjectName,
        legacyPrivateLocationsSavedObjectId
      );
    } catch (e) {
      // we don't need to do anything if the legacy object doesn't exist
      return;
    }
    const legacyLocations = obj?.attributes.locations ?? [];
    if (legacyLocations.length === 0) {
      return;
    }

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

    const { total } = await soClient.find<PrivateLocationAttributes>({
      type: privateLocationSavedObjectName,
      fields: [],
      perPage: 0,
      namespaces: ['*'],
    });

    if (total === legacyLocations.length) {
      await soClient.delete(
        legacyPrivateLocationsSavedObjectName,
        legacyPrivateLocationsSavedObjectId,
        {}
      );
    }
  } catch (e) {
    logger.error(`Error migrating legacy private locations: ${e}`);
  }
};
