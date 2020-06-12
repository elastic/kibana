/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'src/core/server';

export const removeAttributesId: SavedObjectMigrationFn = (doc) => {
  if (typeof doc.attributes === 'object' && doc.attributes !== null) {
    delete (doc.attributes as any).id;
  }
  return doc;
};
