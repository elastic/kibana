/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CommentsNew, CommentsNewArray } from './comments_new';

export const getCommentsNewMock = (): CommentsNew => ({
  comment: 'some comments',
});

export const getCommentsNewArrayMock = (): CommentsNewArray => [
  getCommentsNewMock(),
  getCommentsNewMock(),
];
