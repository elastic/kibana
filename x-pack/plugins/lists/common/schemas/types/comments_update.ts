/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

import { comments } from './comments';
import { commentsNew } from './comments_new';

export const commentsUpdateArray = t.array(t.union([comments, commentsNew]));
export type CommentsUpdateArray = t.TypeOf<typeof commentsUpdateArray>;
export const commentsUpdateArrayOrUndefined = t.union([commentsUpdateArray, t.undefined]);
export type CommentsUpdateArrayOrUndefined = t.TypeOf<typeof commentsUpdateArrayOrUndefined>;
