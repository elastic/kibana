/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DATE_NOW, USER } from '../../constants.mock';

import { CommentsArray } from './comments';

export const getCommentsMock = (): CommentsArray => [
  {
    comment: 'some comment',
    created_at: DATE_NOW,
    created_by: USER,
  },
  {
    comment: 'some other comment',
    created_at: DATE_NOW,
    created_by: 'lily',
  },
];
