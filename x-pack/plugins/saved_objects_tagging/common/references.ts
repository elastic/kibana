/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { SavedObjectReference } from '../../../../src/core/types';
import { tagSavedObjectTypeName } from './constants';

/**
 * Create a {@link SavedObjectReference | reference} for given tag id.
 */
export const tagIdToReference = (tagId: string): SavedObjectReference => ({
  type: tagSavedObjectTypeName,
  id: tagId,
  name: `tag-ref-${tagId}`,
});

/**
 * Update the given `references` array, replacing all the `tag` references with
 * references for the given `newTagIds`, while preserving all references to non-tag objects.
 */
export const replaceTagReferences = (
  references: SavedObjectReference[],
  newTagIds: string[]
): SavedObjectReference[] => {
  return [
    ...references.filter(({ type }) => type !== tagSavedObjectTypeName),
    ...newTagIds.map(tagIdToReference),
  ];
};

/**
 * Update the given `references` array, adding references to `toAdd` tag ids and removing references
 * to `toRemove` tag ids.
 * All references to non-tag objects will be preserved
 */
export const updateTagReferences = ({
  references,
  toAdd = [],
  toRemove = [],
}: {
  references: SavedObjectReference[];
  toAdd?: string[];
  toRemove?: string[];
}): SavedObjectReference[] => {
  const nonTagReferences = references.filter(({ type }) => type !== tagSavedObjectTypeName);
  const newTagIds = uniq([
    ...references
      .filter(({ type }) => type === tagSavedObjectTypeName)
      .map(({ id }) => id)
      .filter((id) => !toRemove.includes(id)),
    ...toAdd,
  ]);

  return [...nonTagReferences, ...newTagIds.map(tagIdToReference)];
};
