/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { SavedObjectsLegacyService, IClusterClient } from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../common/constants';

interface Deps {
  esClient: IClusterClient;
  savedObjects: SavedObjectsLegacyService;
}

export async function createDefaultSpace({ esClient, savedObjects }: Deps) {
  const { getSavedObjectsRepository, SavedObjectsClient } = savedObjects;

  const savedObjectsRepository = getSavedObjectsRepository(esClient.callAsInternalUser, ['space']);

  const defaultSpaceExists = await doesDefaultSpaceExist(
    SavedObjectsClient,
    savedObjectsRepository
  );

  if (defaultSpaceExists) {
    return;
  }

  const options = {
    id: DEFAULT_SPACE_ID,
  };

  try {
    await savedObjectsRepository.create(
      'space',
      {
        name: i18n.translate('xpack.spaces.defaultSpaceTitle', {
          defaultMessage: 'Default',
        }),
        description: i18n.translate('xpack.spaces.defaultSpaceDescription', {
          defaultMessage: 'This is your default space!',
        }),
        color: '#00bfb3',
        disabledFeatures: [],
        _reserved: true,
      },
      options
    );
  } catch (error) {
    // Ignore conflict errors.
    // It is possible that another Kibana instance, or another invocation of this function
    // created the default space in the time it took this to complete.
    if (SavedObjectsClient.errors.isConflictError(error)) {
      return;
    }
    throw error;
  }
}

async function doesDefaultSpaceExist(SavedObjectsClient: any, savedObjectsRepository: any) {
  try {
    await savedObjectsRepository.get('space', DEFAULT_SPACE_ID);
    return true;
  } catch (e) {
    if (SavedObjectsClient.errors.isNotFoundError(e)) {
      return false;
    }
    throw e;
  }
}
