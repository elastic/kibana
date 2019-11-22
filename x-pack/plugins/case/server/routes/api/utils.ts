/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify, isBoom } from 'boom';
import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';
import {
  NewCaseType,
  NewCaseFormatted,
  NewCommentType,
  NewCommentFormatted,
  UpdatedCaseType,
  UpdatedCaseFormatted,
  UserType,
  UpdatedCommentType,
} from './types';

export const formatNewCase = (
  newCase: NewCaseType,
  { full_name, username }: { full_name?: string; username: string }
): NewCaseFormatted => ({
  creation_date: new Date().valueOf(),
  last_edit_date: new Date().valueOf(),
  reporter: { full_name, username },
  ...newCase,
});

interface NewCommentArgs {
  newComment: NewCommentType;
  full_name?: UserType['full_name'];
  username: UserType['username'];
  case_workflow_id: string;
}
export const formatNewComment = ({
  newComment,
  full_name,
  username,
  case_workflow_id,
}: NewCommentArgs): NewCommentFormatted => ({
  creation_date: new Date().valueOf(),
  last_edit_date: new Date().valueOf(),
  user: { full_name, username },
  case_workflow_id,
  ...newComment,
});

export const formatUpdatedCase = (updateCase: UpdatedCaseType): UpdatedCaseFormatted => ({
  ...updateCase,
  last_edit_date: new Date().valueOf(),
});

export const formatUpdatedComment = (updatedComment: NewCommentType): UpdatedCommentType => ({
  ...updatedComment,
  last_edit_date: new Date().valueOf(),
});

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = isBoom(error) ? error : boomify(error);
  return {
    body: boom,
    headers: boom.output.headers,
    statusCode: boom.output.statusCode,
  };
}
