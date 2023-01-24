/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { Space } from '../../../common';

export const migrateTo660 = (doc: SavedObjectUnsanitizedDoc<Space>) => {
  if (!doc.attributes.hasOwnProperty('disabledFeatures')) {
    doc.attributes.disabledFeatures = [];
  }
  return doc;
};
