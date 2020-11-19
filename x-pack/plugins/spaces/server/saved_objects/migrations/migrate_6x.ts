/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'src/core/server';

export const migrateToKibana660: SavedObjectMigrationFn<any, any> = (doc) => {
  if (!doc.attributes.hasOwnProperty('disabledFeatures')) {
    doc.attributes.disabledFeatures = [];
  }
  return doc;
};
