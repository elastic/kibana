/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsFindOptionsReference,
  SavedObject,
} from 'src/core/server';
import { tagSavedObjectTypeName } from '../../../common/constants';
import { Tag, TagAttributes, TagWithRelations } from '../../../common/types';

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

  const pitFinder = client.createPointInTimeFinder<TagAttributes>({
    type: targetTypes,
    perPage: 1000,
    hasReference: references,
    hasReferenceOperator: 'OR',
  });

  const results: SavedObject[] = [];
  for await (const response of pitFinder.find()) {
    results.push(...response.saved_objects);
  }

  results.forEach((obj) => {
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
