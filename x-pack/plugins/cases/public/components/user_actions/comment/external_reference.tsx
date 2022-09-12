/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentResponseExternalReferenceType } from '../../../../common/api';
import { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { SnakeToCamelCase } from '../../../../common/types';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'externalReferenceAttachmentTypeRegistry'
  | 'caseData'
  | 'handleDeleteComment'
  | 'userProfiles'
> & {
  comment: SnakeToCamelCase<CommentResponseExternalReferenceType>;
  isLoading: boolean;
};

export const createExternalReferenceAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  comment,
  externalReferenceAttachmentTypeRegistry,
  caseData,
  isLoading,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    comment,
    registry: externalReferenceAttachmentTypeRegistry,
    caseData,
    handleDeleteComment,
    isLoading,
    getId: () => comment.externalReferenceAttachmentTypeId,
    getAttachmentViewProps: () => ({
      externalReferenceId: comment.externalReferenceId,
      externalReferenceMetadata: comment.externalReferenceMetadata,
    }),
  });
};
