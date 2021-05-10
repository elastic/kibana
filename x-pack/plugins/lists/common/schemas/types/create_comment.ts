/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const createComment = t.exact(
  t.type({
    comment: NonEmptyString,
  })
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type CreateComment = t.TypeOf<typeof createComment>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const createCommentsArray = t.array(createComment);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type CreateCommentsArray = t.TypeOf<typeof createCommentsArray>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type CreateComments = t.TypeOf<typeof createComment>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const createCommentsArrayOrUndefined = t.union([createCommentsArray, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type CreateCommentsArrayOrUndefined = t.TypeOf<typeof createCommentsArrayOrUndefined>;
