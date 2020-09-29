/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';
import { created_at, created_by, id, updated_at, updated_by } from '../common/schemas';

export const comment = t.intersection([
  t.exact(
    t.type({
      comment: NonEmptyString,
      created_at,
      created_by,
      id,
    })
  ),
  t.exact(
    t.partial({
      updated_at,
      updated_by,
    })
  ),
]);

export const commentsArray = t.array(comment);
export type CommentsArray = t.TypeOf<typeof commentsArray>;
export type Comment = t.TypeOf<typeof comment>;
export const commentsArrayOrUndefined = t.union([commentsArray, t.undefined]);
export type CommentsArrayOrUndefined = t.TypeOf<typeof commentsArrayOrUndefined>;
