/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn } from '@kbn/core/server';
import { DynamicSettings } from '../../../common/runtime_types';

export const add820Indices: SavedObjectMigrationFn<DynamicSettings, DynamicSettings> = (doc) => {
  const heartbeatIndices = doc.attributes?.heartbeatIndices;

  const indicesArr = !heartbeatIndices ? [] : heartbeatIndices.split(',');

  if (!indicesArr.includes('synthetics-*')) {
    indicesArr.push('synthetics-*');
  }

  if (!indicesArr.includes('heartbeat-8*')) {
    indicesArr.push('heartbeat-8*');
  }

  const migratedObj = {
    ...doc,
    attributes: {
      ...doc.attributes,
      heartbeatIndices: indicesArr.join(','),
    },
  };

  return migratedObj;
};
