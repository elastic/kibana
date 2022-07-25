/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn } from '@kbn/core/server';

export const removeAttributesId: SavedObjectMigrationFn<any, any> = (doc) => {
  if (typeof doc.attributes === 'object' && doc.attributes !== null) {
    delete (doc.attributes as any).id;
  }
  return doc;
};
