/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/types';
import type { Tag, TagAttributes } from '@kbn/saved-objects-tagging-oss-plugin/common';

export type TagSavedObject = SavedObject<TagAttributes>;

export type TagWithRelations = Tag & {
  /**
   * The number of objects that are assigned to this tag.
   */
  relationCount: number;
};

// re-export types from oss definition
export type {
  Tag,
  TagAttributes,
  GetAllTagsOptions,
  ITagsClient,
} from '@kbn/saved-objects-tagging-oss-plugin/common';
