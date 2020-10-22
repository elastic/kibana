/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectReference } from 'src/core/types';
import { Tag, tagSavedObjectTypeName } from '../common';

export const getObjectTags = (object: SavedObject, allTags: Tag[]) => {
  const tagReferences = object.references.filter((ref) => ref.type === tagSavedObjectTypeName);

  const foundTags: Tag[] = [];
  const missingRefs: SavedObjectReference[] = [];

  tagReferences.forEach((ref) => {
    const found = allTags.find((tag) => tag.id === ref.id);
    if (found) {
      foundTags.push(found);
    } else {
      missingRefs.push(ref);
    }
  });

  return {
    tags: foundTags,
    missingRefs,
  };
};

export const convertTagNameToId = (tagName: string, allTags: Tag[]): string | undefined => {
  const found = allTags.find((tag) => tag.name === tagName);
  return found?.id;
};

export const byNameTagSorter = (tagA: Tag, tagB: Tag): number => {
  return tagA.name.localeCompare(tagB.name);
};

export const testSubjFriendly = (name: string) => {
  return name.replace(' ', '_');
};
