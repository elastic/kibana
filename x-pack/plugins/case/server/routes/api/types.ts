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
  SavedObjectsFindOptionsSchema,
  UpdatedCaseSchema,
  UpdatedCommentSchema,
  UserSchema,
} from './schema';
import { SavedObjectAttributes } from '../../../../../../src/core/types';

export type NewCaseType = TypeOf<typeof NewCaseSchema>;
export type CommentAttributes = TypeOf<typeof CommentSchema> & SavedObjectAttributes;
export type NewCommentType = TypeOf<typeof NewCommentSchema>;
export type SavedObjectsFindOptionsType = TypeOf<typeof SavedObjectsFindOptionsSchema>;
export type UpdatedCaseTyped = TypeOf<typeof UpdatedCaseSchema>;
export type UpdatedCommentType = TypeOf<typeof UpdatedCommentSchema>;
export type UserType = TypeOf<typeof UserSchema>;

export interface CaseAttributes extends NewCaseType, SavedObjectAttributes {
  created_at: string;
  created_by: UserType;
  updated_at: string;
}

export type FlattenedCaseSavedObject = CaseAttributes & {
  case_id: string;
  comments: FlattenedCommentSavedObject[];
};

export type FlattenedCasesSavedObject = Array<
  CaseAttributes & {
    case_id: string;
    // TO DO it is partial because we need to add it the commentCount
    commentCount?: number;
  }
>;

export interface AllCases {
  cases: FlattenedCasesSavedObject;
  page: number;
  per_page: number;
  total: number;
}

export type FlattenedCommentSavedObject = CommentAttributes & {
  comment_id: string;
  // TO DO We might want to add the case_id where this comment is related too
};

export interface AllComments {
  comments: FlattenedCommentSavedObject[];
  page: number;
  per_page: number;
  total: number;
}

export interface UpdatedCaseType {
  description?: UpdatedCaseTyped['description'];
  state?: UpdatedCaseTyped['state'];
  tags?: UpdatedCaseTyped['tags'];
  title?: UpdatedCaseTyped['title'];
  updated_at: string;
}
