/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DATE_NOW, ID, USER } from '../../constants.mock';

import { Comment, CommentsArray } from './comment';

export const getCommentsMock = (): Comment => ({
  comment: 'some old comment',
  created_at: DATE_NOW,
  created_by: USER,
  id: ID,
});

export const getCommentsArrayMock = (): CommentsArray => [getCommentsMock(), getCommentsMock()];
