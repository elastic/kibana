/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'src/core/server';
import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './constants';
import { getSavedObjectReference } from './get_saved_object_reference';

/**
 * Given an index and a saved object reference, this will return the specific "exceptionsList" saved object reference
 * even if it is mixed in with other reference objects. This is needed since a references array can contain multiple
 * types of saved objects in a single array, we have to use the "exceptionsList" name to get the value.
 * @param index The index position to get for the exceptions list.
 * @param savedObjectReferences The saved object references which can contain "exceptionsList" mixed with other saved object types
 * @returns The saved object reference if found, otherwise undefined
 */
export const getSavedObjectReferenceForExceptionsList = ({
  index,
  savedObjectReferences,
}: {
  index: number;
  savedObjectReferences: SavedObjectReference[];
}): SavedObjectReference | undefined =>
  getSavedObjectReference({
    name: EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME,
    index,
    savedObjectReferences,
  });
