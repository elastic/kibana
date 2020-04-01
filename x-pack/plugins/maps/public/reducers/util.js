/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const TRACKED_LAYER_DESCRIPTOR = '__trackedLayerDescriptor';

export function copyPersistentState(input) {
  if (typeof input !== 'object' || input === null) {
    //primitive
    return input;
  }
  const copyInput = Array.isArray(input) ? [] : {};
  for (const key in input) {
    if (!key.startsWith('__')) {
      copyInput[key] = copyPersistentState(input[key]);
    }
  }
  return copyInput;
}
