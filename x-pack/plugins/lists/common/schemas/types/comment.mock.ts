/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comment, CommentsArray } from '@kbn/securitysolution-io-ts-list-types';

import { DATE_NOW, ID, USER } from '../../constants.mock';

export const getCommentsMock = (): Comment => ({
  comment: 'some old comment',
  created_at: DATE_NOW,
  created_by: USER,
  id: ID,
});

export const getCommentsArrayMock = (): CommentsArray => [getCommentsMock(), getCommentsMock()];
