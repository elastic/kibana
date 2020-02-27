/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectUnsanitizedDoc } from 'src/core/server';

export function migrateToKibana660(doc: SavedObjectUnsanitizedDoc) {
  const attributes = doc.attributes as Record<string, any>;
  if (!attributes.hasOwnProperty('disabledFeatures')) {
    attributes.disabledFeatures = [];
  }
  return doc;
}
