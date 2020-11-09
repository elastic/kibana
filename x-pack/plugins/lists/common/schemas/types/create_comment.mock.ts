/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CreateComment, CreateCommentsArray } from './create_comment';

export const getCreateCommentsMock = (): CreateComment => ({
  comment: 'some comments',
});

export const getCreateCommentsArrayMock = (): CreateCommentsArray => [getCreateCommentsMock()];
