/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentResponseTypePersistableState } from '../../../../common/api';
import { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { SnakeToCamelCase } from '../../../../common/types';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  'userAction' | 'persistableStateAttachmentTypeRegistry' | 'caseData'
> & {
  comment: SnakeToCamelCase<CommentResponseTypePersistableState>;
};

export const createPersistableStateAttachmentUserActionBuilder = ({
  userAction,
  comment,
  persistableStateAttachmentTypeRegistry,
  caseData,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    comment,
    registry: persistableStateAttachmentTypeRegistry,
    caseData,
    getId: () => comment.persistableStateAttachmentTypeId,
    getAttachmentViewProps: () => ({
      persistableStateAttachmentTypeId: comment.persistableStateAttachmentTypeId,
      persistableStateAttachmentState: comment.persistableStateAttachmentState,
    }),
  });
};
