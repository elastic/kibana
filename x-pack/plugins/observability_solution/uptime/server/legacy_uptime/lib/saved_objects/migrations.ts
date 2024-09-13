/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn } from '@kbn/core/server';
import { DynamicSettingsAttributes } from '../../../runtime_types/settings';

export const add820Indices: SavedObjectMigrationFn<
  DynamicSettingsAttributes,
  DynamicSettingsAttributes
> = (doc) => {
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

export const remove890Indices: SavedObjectMigrationFn<
  DynamicSettingsAttributes,
  DynamicSettingsAttributes
> = (doc) => {
  const heartbeatIndices = doc.attributes?.heartbeatIndices;

  const indicesArr = !heartbeatIndices ? [] : heartbeatIndices.split(',');

  // remove synthetics-* from the array
  const indexToRemove = indicesArr.indexOf('synthetics-*');
  if (indexToRemove > -1) {
    indicesArr.splice(indexToRemove, 1);
  }

  if (!indicesArr.includes('heartbeat-8*')) {
    indicesArr.push('heartbeat-8*');
  }

  const syntheticsIndexRemoved = indexToRemove > -1;

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      heartbeatIndices: indicesArr.join(','),
      ...(syntheticsIndexRemoved && { syntheticsIndexRemoved }),
    },
  };
};
