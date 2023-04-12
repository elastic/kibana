/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { TagAttributes } from '@kbn/saved-objects-tagging-plugin/common';
import type { OutputError } from '@kbn/securitysolution-es-utils';
import { transformError } from '@kbn/securitysolution-es-utils';

interface CreateTagParams {
  savedObjectsClient: SavedObjectsClientContract;
  tagName: string;
  description: string;
  color: string;
  references?: SavedObjectReference[];
}

interface CreateTagResponse {
  error?: OutputError;
  response: SavedObject<TagAttributes> | null;
}

export const createTag = async ({
  savedObjectsClient,
  tagName,
  description,
  color,
  references,
}: CreateTagParams): Promise<CreateTagResponse> => {
  const TYPE = 'tag';
  try {
    const createdTag = await savedObjectsClient.create<TagAttributes>(
      TYPE,
      {
        name: tagName,
        description,
        color,
      },
      { references }
    );

    return {
      response: createdTag,
    };
  } catch (e) {
    return {
      error: transformError(e),
      response: null,
    };
  }
};
