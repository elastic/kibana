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
import { getRandomColor } from '../../../../common/utils/get_ramdom_color';

interface CreateTagParams {
  savedObjectsClient: SavedObjectsClientContract;
  tagName: string;
  description: string;
  color?: string;
  references?: SavedObjectReference[];
}

export const createTag = async ({
  savedObjectsClient,
  tagName,
  description,
  color,
  references,
}: CreateTagParams): Promise<SavedObject<TagAttributes>> => {
  const createdTag = await savedObjectsClient.create<TagAttributes>(
    'tag',
    {
      name: tagName,
      description,
      color: color ?? getRandomColor(),
    },
    { references }
  );

  return createdTag;
};
