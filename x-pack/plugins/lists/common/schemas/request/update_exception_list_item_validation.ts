/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UpdateExceptionListItemSchema } from './update_exception_list_item_schema';

export const validateComments = (item: UpdateExceptionListItemSchema): string[] => {
  if (item.comments == null) {
    return [];
  }

  const [appendOnly] = item.comments.reduce(
    (acc, comment) => {
      const [, hasNewComments] = acc;
      if (comment.id == null) {
        return [true, true];
      }

      if (hasNewComments && comment.id != null) {
        return [false, true];
      }

      return acc;
    },
    [true, false]
  );
  if (!appendOnly) {
    return ['item "comments" are append only'];
  } else {
    return [];
  }
};

export const updateExceptionListItemValidate = (
  schema: UpdateExceptionListItemSchema
): string[] => {
  return [...validateComments(schema)];
};
