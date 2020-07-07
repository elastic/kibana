/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCommentsMock } from './comments.mock';
import { getCreateCommentsMock } from './create_comments.mock';
import { UpdateCommentsArray } from './update_comments';

export const getUpdateCommentsArrayMock = (): UpdateCommentsArray => [
  getCommentsMock(),
  getCreateCommentsMock(),
];
