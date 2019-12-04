/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  CommentSchema,
  NewCaseSchema,
  NewCommentSchema,
  UpdatedCaseSchema,
  UpdatedCommentSchema,
  UserSchema,
} from './schema';

export type NewCaseType = TypeOf<typeof NewCaseSchema>;
export type NewCommentFormatted = TypeOf<typeof CommentSchema>;
export type NewCommentType = TypeOf<typeof NewCommentSchema>;
export type UpdatedCaseTyped = TypeOf<typeof UpdatedCaseSchema>;
export type UpdatedCommentType = TypeOf<typeof UpdatedCommentSchema>;
export type UserType = TypeOf<typeof UserSchema>;

export interface NewCaseFormatted extends NewCaseType {
  created_at: number;
  created_by: UserType;
}

export interface UpdatedCaseType {
  assignees?: UpdatedCaseTyped['assignees'];
  description?: UpdatedCaseTyped['description'];
  title?: UpdatedCaseTyped['title'];
  state?: UpdatedCaseTyped['state'];
  tags?: UpdatedCaseTyped['tags'];
  case_type?: UpdatedCaseTyped['case_type'];
}
