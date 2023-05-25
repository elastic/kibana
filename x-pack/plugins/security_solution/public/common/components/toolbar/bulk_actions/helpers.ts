/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { intersection, union } from 'lodash';

export const createInitialTagsState = (existingTags: string[][], defaultTags: string[]) => {
  const existingTagsIntersection = intersection(...existingTags);
  const existingTagsUnion = union(...existingTags);
  const allTagsUnion = union(existingTagsUnion, defaultTags);
  return allTagsUnion
    .map((tag): EuiSelectableOption => {
      return {
        label: tag,
        checked: existingTagsIntersection.includes(tag)
          ? 'on'
          : existingTagsUnion.includes(tag)
          ? 'off'
          : undefined,
      };
    })
    .sort((a, b) => (a.checked ? a.checked < b.checked : true));
};
