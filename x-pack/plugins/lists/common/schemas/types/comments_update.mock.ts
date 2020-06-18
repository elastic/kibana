/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCommentsMock } from './comments.mock';
import { getCommentsNewMock } from './comments_new.mock';
import { CommentsUpdateArray } from './comments_update';

export const getCommentsUpdateArrayMock = (): CommentsUpdateArray => [
  getCommentsMock(),
  getCommentsNewMock(),
];
