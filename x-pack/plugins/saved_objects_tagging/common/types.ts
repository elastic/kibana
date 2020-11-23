/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/types';
import type { Tag, TagAttributes } from '../../../../src/plugins/saved_objects_tagging_oss/common';

export type TagSavedObject = SavedObject<TagAttributes>;

export type TagWithRelations = Tag & {
  /**
   * The number of objects that are assigned to this tag.
   */
  relationCount: number;
};

/**
 * Represent an assignable saved object, as returned by the `_find_assignable_objects` API
 */
export interface AssignableObject {
  id: string;
  type: string;
  icon?: string;
  title: string;
  tags: string[];
}

// re-export types from oss definition
export type {
  Tag,
  TagAttributes,
  ITagsClient,
} from '../../../../src/plugins/saved_objects_tagging_oss/common';
