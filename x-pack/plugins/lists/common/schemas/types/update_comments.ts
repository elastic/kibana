/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

import { comments } from './comments';
import { createComments } from './create_comments';

export const updateCommentsArray = t.array(t.union([comments, createComments]));
export type UpdateCommentsArray = t.TypeOf<typeof updateCommentsArray>;
export const updateCommentsArrayOrUndefined = t.union([updateCommentsArray, t.undefined]);
export type UpdateCommentsArrayOrUndefined = t.TypeOf<typeof updateCommentsArrayOrUndefined>;
