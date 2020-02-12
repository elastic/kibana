/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { SavedObject } from 'kibana/server';
import {
  CommentSchema,
  NewCaseSchema,
  NewCommentSchema,
  SavedObjectsFindOptionsSchema,
  SavedObjectsFindOptionsSchemaFormatted,
  UpdatedCaseSchema,
  UpdatedCommentSchema,
  UserSchema,
} from './schema';
import { SavedObjectAttributes } from '../../../../../../src/core/types';

export type NewCaseType = TypeOf<typeof NewCaseSchema>;
export type CommentAttributes = TypeOf<typeof CommentSchema> & SavedObjectAttributes;
export type NewCommentType = TypeOf<typeof NewCommentSchema>;
export type SavedObjectsFindOptionsType = TypeOf<typeof SavedObjectsFindOptionsSchema>;
export type SavedObjectsFindOptionsTypeFormatted = TypeOf<
  typeof SavedObjectsFindOptionsSchemaFormatted
>;
export type UpdatedCaseTyped = TypeOf<typeof UpdatedCaseSchema>;
export type UpdatedCommentType = TypeOf<typeof UpdatedCommentSchema>;
export type UserType = TypeOf<typeof UserSchema>;

export interface CaseAttributes extends NewCaseType, SavedObjectAttributes {
  created_at: number;
  created_by: UserType;
  updated_at: number;
}

export type FlattenedCaseSavedObject = Omit<
  SavedObject<CaseAttributes>,
  'updated_at' | 'attributes'
> &
  CaseAttributes;

export interface AllCases {
  cases: FlattenedCaseSavedObject[];
  page: number;
  per_page: number;
  total: number;
}

export type FlattenedCommentSavedObject = Omit<
  SavedObject<CommentAttributes>,
  'updated_at' | 'attributes'
> &
  CommentAttributes;

export interface AllComments {
  comments: FlattenedCommentSavedObject[];
  page: number;
  per_page: number;
  total: number;
}

export interface UpdatedCaseType {
  case_type?: UpdatedCaseTyped['case_type'];
  description?: UpdatedCaseTyped['description'];
  state?: UpdatedCaseTyped['state'];
  tags?: UpdatedCaseTyped['tags'];
  title?: UpdatedCaseTyped['title'];
  updated_at: number;
}
