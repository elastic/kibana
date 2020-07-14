/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceSetup } from 'kibana/server';
import mappings from './mappings.json';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  savedObjects.registerType({
    name: 'action',
    hidden: true,
    namespaceType: 'single',
    mappings: mappings.action,
  });

  // Encrypted attributes
  // - `secrets` properties will be encrypted
  // - `config` will be included in AAD
  // - everything else excluded from AAD
  encryptedSavedObjects.registerType({
    type: 'action',
    attributesToEncrypt: new Set(['secrets']),
    attributesToExcludeFromAAD: new Set(['name']),
  });

  savedObjects.registerType({
    name: 'action_task_params',
    hidden: true,
    namespaceType: 'single',
    mappings: mappings.action_task_params,
  });
  encryptedSavedObjects.registerType({
    type: 'action_task_params',
    attributesToEncrypt: new Set(['apiKey']),
  });
}
