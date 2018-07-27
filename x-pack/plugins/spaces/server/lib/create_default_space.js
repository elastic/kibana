/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../server/lib/get_client_shield';
import { DEFAULT_SPACE_ID } from '../../common/constants';

export async function createDefaultSpace(server) {
  const { callWithInternalUser: callCluster } = getClient(server);

  const { getSavedObjectsRepository, SavedObjectsClient } = server.savedObjects;

  const savedObjectsRepository = getSavedObjectsRepository(callCluster);

  const defaultSpaceExists = await doesDefaultSpaceExist(SavedObjectsClient, savedObjectsRepository);

  if (defaultSpaceExists) {
    return;
  }

  const options = {
    id: DEFAULT_SPACE_ID
  };

  await savedObjectsRepository.create('space', {
    name: 'Default Space',
    description: 'This is your Default Space!',
    _reserved: true
  }, options);
}

async function doesDefaultSpaceExist(SavedObjectsClient, savedObjectsRepository) {
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
