/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertTags } from '../../../../../common/detection_engine/schemas/common';

export const validateAlertTagsArrays = (tags: AlertTags) => {
  const { tags_to_add: tagsToAdd, tags_to_remove: tagsToRemove } = tags;
  const duplicates = tagsToAdd.filter((tag) => tagsToRemove.includes(tag));
  if (duplicates.length) {
    return [
      `Duplicate tags [${JSON.stringify(
        duplicates
      )}] were found in the tags_to_add and tags_to_remove parameters`,
    ];
  }
  return [];
};
