/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsFindOptionsReference } from 'src/core/server';
import { tagSavedObjectTypeName } from '../../../common/constants';
import { Tag, TagWithRelations } from '../../../common/types';

export const addConnectionCount = async (
  tags: Tag[],
  targetTypes: string[],
  client: SavedObjectsClientContract
): Promise<TagWithRelations[]> => {
  const ids = new Set(tags.map((tag) => tag.id));
  const counts: Map<string, number> = new Map(tags.map((tag) => [tag.id, 0]));

  const references: SavedObjectsFindOptionsReference[] = tags.map(({ id }) => ({
    type: 'tag',
    id,
  }));

  const allResults = await client.find({
    type: targetTypes,
    page: 1,
    perPage: 10000,
    hasReference: references,
    hasReferenceOperator: 'OR',
  });
  allResults.saved_objects.forEach((obj) => {
    obj.references.forEach((ref) => {
      if (ref.type === tagSavedObjectTypeName && ids.has(ref.id)) {
        counts.set(ref.id, counts.get(ref.id)! + 1);
      }
    });
  });

  return tags.map((tag) => ({
    ...tag,
    relationCount: counts.get(tag.id)!,
  }));
};
