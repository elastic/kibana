/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License;
//  * you may not use this file except in compliance with the Elastic License.
//  */
// import {
//   SavedObjectMigrationMap,
//   SavedObjectUnsanitizedDoc,
//   SavedObjectMigrationFn,
//   SavedObjectMigrationContext,
// } from '../../../../../src/core/server';
// import { RawAlert } from '../types';
// import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

// export function getMigrations(
//   encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
// ): SavedObjectMigrationMap {
//   const alertsMigration = changeAlertingConsumer(encryptedSavedObjects, 'alerting', 'alerts');

//   const infrastructureMigration = changeAlertingConsumer(
//     encryptedSavedObjects,
//     'metrics',
//     'infrastructure'
//   );

//   return {
//     '7.10.0': (doc: SavedObjectUnsanitizedDoc<RawAlert>, context: SavedObjectMigrationContext) => {
//       if (doc.attributes.consumer === 'alerting') {
//         return executeMigration(doc, context, alertsMigration);
//       } else if (doc.attributes.consumer === 'metrics') {
//         return executeMigration(doc, context, infrastructureMigration);
//       }
//       return doc;
//     },
//   };
// }

// function executeMigration(
//   doc: SavedObjectUnsanitizedDoc<RawAlert>,
//   context: SavedObjectMigrationContext,
//   migrationFunc: SavedObjectMigrationFn<RawAlert, RawAlert>
// ) {
//   try {
//     return migrationFunc(doc, context);
//   } catch (ex) {
//     context.log.error(
//       `encryptedSavedObject migration failed for alert ${doc.id} with error: ${ex.message}`,
//       { alertDocument: doc }
//     );
//   }
//   return doc;
// }

// function changeAlertingConsumer(
//   encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
//   from: string,
//   to: string
// ): SavedObjectMigrationFn<RawAlert, RawAlert> {
//   return encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
//     function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
//       return doc.attributes.consumer === from;
//     },
//     (doc: SavedObjectUnsanitizedDoc<RawAlert>): SavedObjectUnsanitizedDoc<RawAlert> => {
//       const {
//         attributes: { consumer },
//       } = doc;
//       return {
//         ...doc,
//         attributes: {
//           ...doc.attributes,
//           consumer: consumer === from ? to : consumer,
//         },
//       };
//     }
//   );
// }
