/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';
import { id } from '../common/schemas';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
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

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type UpdateComment = t.TypeOf<typeof updateComment>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const updateCommentsArray = t.array(updateComment);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type UpdateCommentsArray = t.TypeOf<typeof updateCommentsArray>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const updateCommentsArrayOrUndefined = t.union([updateCommentsArray, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type UpdateCommentsArrayOrUndefined = t.TypeOf<typeof updateCommentsArrayOrUndefined>;
