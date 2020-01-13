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
  UserType,
} from './types';

export const formatNewCase = (
  newCase: NewCaseType,
  { full_name, username }: { full_name?: string; username: string }
): NewCaseFormatted => ({
  created_at: new Date().valueOf(),
  created_by: { full_name, username },
  ...newCase,
});

interface NewCommentArgs {
  newComment: NewCommentType;
  full_name?: UserType['full_name'];
  username: UserType['username'];
}
export const formatNewComment = ({
  newComment,
  full_name,
  username,
}: NewCommentArgs): NewCommentFormatted => ({
  ...newComment,
  created_at: new Date().valueOf(),
  created_by: { full_name, username },
});

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = isBoom(error) ? error : boomify(error);
  return {
    body: boom,
    headers: boom.output.headers,
    statusCode: boom.output.statusCode,
  };
}
