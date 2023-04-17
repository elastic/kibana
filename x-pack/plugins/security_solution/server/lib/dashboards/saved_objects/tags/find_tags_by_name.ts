/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import type { TagAttributes } from '@kbn/saved-objects-tagging-plugin/common';
import type { OutputError } from '@kbn/securitysolution-es-utils';
import { transformError } from '@kbn/securitysolution-es-utils';

export const findTagsByName = async ({
  savedObjectsClient,
  search,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  search: string;
}): Promise<{
  response: Array<SavedObjectsFindResult<TagAttributes>> | null;
  error?: OutputError;
}> => {
  try {
    const tagResponse = await savedObjectsClient.find<TagAttributes>({
      type: 'tag',
      search,
      searchFields: ['name'],
      sortField: 'updated_at',
      sortOrder: 'desc',
    });
    return {
      response: tagResponse.saved_objects.filter(({ attributes: { name } }) => name === search),
    };
  } catch (e) {
    return {
      error: transformError(e),
      response: null,
    };
  }
};
