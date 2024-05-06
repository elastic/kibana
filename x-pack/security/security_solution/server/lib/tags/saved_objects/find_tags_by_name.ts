/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import type { TagAttributes } from '@kbn/saved-objects-tagging-plugin/common';

export const findTagsByName = async ({
  savedObjectsClient,
  tagName,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  tagName: string;
}): Promise<Array<SavedObjectsFindResult<TagAttributes>>> => {
  const tagResponse = await savedObjectsClient.find<TagAttributes>({
    type: 'tag',
    search: `"${tagName}"`,
    searchFields: ['name'],
    sortField: 'updated_at',
    sortOrder: 'desc',
  });
  return tagResponse.saved_objects.filter(({ attributes: { name } }) => name === tagName);
};
