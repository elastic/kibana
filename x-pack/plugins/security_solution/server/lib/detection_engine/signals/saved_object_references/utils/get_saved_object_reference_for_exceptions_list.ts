/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'src/core/server';
import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './constants';
import { getSavedObjectReference } from './get_saved_object_reference';

export const getSavedObjectReferenceForExceptionsList = (
  index: number,
  savedObjectReferences: SavedObjectReference[]
): SavedObjectReference | undefined =>
  getSavedObjectReference(EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME, index, savedObjectReferences);
