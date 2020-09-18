/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceSetup } from 'kibana/server';
import mappings from './mappings.json';

// import { getMigrations } from './migrations';
// import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export const ML_SAVED_OBJECT_TYPE = 'ml-job';

// const mappings = {
//   properties: {
//     job_id: {
//       type: 'text',
//       fields: {
//         keyword: {
//           type: 'keyword',
//         },
//       },
//     },
//     datafeed_id: {
//       type: 'text',
//       fields: {
//         keyword: {
//           type: 'keyword',
//         },
//       },
//     },
//     type: {
//       type: 'keyword',
//     },
//   },
// };

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup
  // encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  savedObjects.registerType({
    name: ML_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple',
    // migrations: getMigrations(encryptedSavedObjects),
    mappings: mappings.job,
  });

  // Encrypted attributes
  // encryptedSavedObjects.registerType({
  //   type: 'alert',
  //   attributesToEncrypt: new Set(['apiKey']),
  //   attributesToExcludeFromAAD: new Set([
  //     'scheduledTaskId',
  //     'muteAll',
  //     'mutedInstanceIds',
  //     'updatedBy',
  //   ]),
  // });
}
