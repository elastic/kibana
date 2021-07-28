/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'src/core/server';
import { getSavedObjectNamePattern } from './get_saved_object_name_pattern';

export const getSavedObjectReference = (
  name: string,
  index: number,
  savedObjectReferences: SavedObjectReference[]
): SavedObjectReference | undefined => {
  return savedObjectReferences.find(
    (reference) => reference.name === getSavedObjectNamePattern(name, index)
  );
};
