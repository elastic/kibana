/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID } from '../../constants.mock';

import { UpdateComment, UpdateCommentsArray } from './update_comment';

export const getUpdateCommentMock = (): UpdateComment => ({
  comment: 'some comment',
  id: ID,
});

export const getUpdateCommentsArrayMock = (): UpdateCommentsArray => [
  getUpdateCommentMock(),
  getUpdateCommentMock(),
];
