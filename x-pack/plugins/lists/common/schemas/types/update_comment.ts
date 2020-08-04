/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';
import { id } from '../common/schemas';

export const updateComment = t.intersection([
  t.exact(
    t.type({
      comment: NonEmptyString,
    })
  ),
  t.exact(
    t.partial({
      id,
    })
  ),
]);

export type UpdateComment = t.TypeOf<typeof updateComment>;
export const updateCommentsArray = t.array(updateComment);
export type UpdateCommentsArray = t.TypeOf<typeof updateCommentsArray>;
export const updateCommentsArrayOrUndefined = t.union([updateCommentsArray, t.undefined]);
export type UpdateCommentsArrayOrUndefined = t.TypeOf<typeof updateCommentsArrayOrUndefined>;
