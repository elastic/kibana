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

export type UpdatedCaseTyped = TypeOf<typeof UpdatedCaseSchema>;

export interface UpdatedCaseType {
  assignees?: UpdatedCaseTyped['assignees'];
  comments?: UpdatedCaseTyped['comments'];
  description?: UpdatedCaseTyped['description'];
  name?: UpdatedCaseTyped['name'];
  state?: UpdatedCaseTyped['state'];
  tags?: UpdatedCaseTyped['tags'];
  case_type?: UpdatedCaseTyped['case_type'];
}

export type UpdatedCommentType = TypeOf<typeof UpdatedCommentSchema>;

export interface UpdatedCaseFormatted extends UpdatedCaseType {
  last_edit_date: number;
}

export type NewCaseType = TypeOf<typeof NewCaseSchema>;

export type UserType = TypeOf<typeof UserSchema>;

export interface NewCaseFormatted extends NewCaseType {
  creation_date: number;
  last_edit_date: number;
  reporter: UserType;
}

export type NewCommentType = TypeOf<typeof NewCommentSchema>;

export type NewCommentFormatted = TypeOf<typeof CommentSchema>;
