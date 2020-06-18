/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceSetup } from 'kibana/server';
import mappings from './mappings.json';
import { getMigrations } from './migrations';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  const encryptedType = {
    type: 'alert',
    attributesToEncrypt: new Set(['apiKey']),
    attributesToExcludeFromAAD: new Set([
      'scheduledTaskId',
      'muteAll',
      'mutedInstanceIds',
      'updatedBy',
    ]),
  };

  // Encrypted attributes
  encryptedSavedObjects.registerType(encryptedType);

  savedObjects.registerType({
    name: 'alert',
    hidden: true,
    namespaceType: 'single',
    migrations: getMigrations(encryptedSavedObjects, encryptedType),
    mappings: mappings.alert,
  });
}
