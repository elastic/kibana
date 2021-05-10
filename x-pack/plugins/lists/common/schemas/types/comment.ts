/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';
import { created_at, created_by, id, updated_at, updated_by } from '../common/schemas';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
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

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const commentsArray = t.array(comment);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type CommentsArray = t.TypeOf<typeof commentsArray>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type Comment = t.TypeOf<typeof comment>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const commentsArrayOrUndefined = t.union([commentsArray, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type CommentsArrayOrUndefined = t.TypeOf<typeof commentsArrayOrUndefined>;
