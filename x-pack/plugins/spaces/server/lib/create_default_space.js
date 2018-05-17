/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../server/lib/get_client_shield';
import { DEFAULT_SPACE_ID } from '../../common/constants';

export async function createDefaultSpace(server) {
  const { callWithInternalUser: callCluster } = getClient(server);

  const savedObjectsClient = server.savedObjectsClientFactory({ callCluster });

  const defaultSpaceExists = await doesDefaultSpaceExist(savedObjectsClient);

  if (defaultSpaceExists) {
    return;
  }

  const options = {
    id: DEFAULT_SPACE_ID
  };

  await savedObjectsClient.create('space', {
    name: 'Default Space',
    description: 'This is your Default Space!',
    urlContext: '',
    _reserved: true
  }, options);
}

async function doesDefaultSpaceExist(savedObjectsClient) {
  try {
    await savedObjectsClient.get('space', DEFAULT_SPACE_ID);
    return true;
  } catch (e) {
    if (savedObjectsClient.errors.isNotFoundError(e)) {
      return false;
    }
    throw e;
  }
}
