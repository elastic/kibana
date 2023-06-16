/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { intersection, union } from 'lodash';

// Sorts in order of `on` -> `mixed` -> `undefined`
const checkedSortCallback = (a: EuiSelectableOption, b: EuiSelectableOption) => {
  if (a.checked) {
    if (b.checked) {
      return a.checked <= b.checked ? 1 : -1;
    }
    return -1;
  }
  if (b.checked) {
    return 1;
  }
  return 0;
};

export const createInitialTagsState = (existingTags: string[][], defaultTags: string[]) => {
  const existingTagsIntersection = intersection(...existingTags);
  const existingTagsUnion = union(...existingTags);
  const allTagsUnion = union(existingTagsUnion, defaultTags);
  return allTagsUnion
    .map((tag): EuiSelectableOption => {
      const checkedStatus = existingTagsIntersection.includes(tag)
        ? 'on'
        : existingTagsUnion.includes(tag)
        ? 'mixed'
        : undefined;
      return {
        label: tag,
        checked: checkedStatus,
        'data-test-subj':
          checkedStatus === 'on'
            ? 'selected-alert-tag'
            : checkedStatus === 'mixed'
            ? 'mixed-alert-tag'
            : 'unselected-alert-tag',
      };
    })
    .sort(checkedSortCallback);
};
