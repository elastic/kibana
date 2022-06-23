/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/types';
import { EXTERNAL_REFERENCE_REF_NAME } from '../../../common/constants';
import {
  ActionTypes,
  Actions,
  CommentUserAction,
  CommentType,
  ExternalReferenceStorageType,
} from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import { UserActionParameters, BuilderReturnValue } from '../types';

export class CommentUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'comment'>): BuilderReturnValue {
    const commentUserAction = this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.update,
      valueKey: 'comment',
      value: extractAttachmentFrameworkIds(args.payload.attachment),
      type: ActionTypes.comment,
    });

    return {
      ...commentUserAction,
      references: [
        ...commentUserAction.references,
        ...createAttachmentFrameworkSOReference(args.payload.attachment),
      ],
    };
  }
}

const extractAttachmentFrameworkIds = (attachment: CommentUserAction['payload']['comment']) => {
  if (
    attachment.type === CommentType.externalReference &&
    attachment.externalReferenceStorage.type === ExternalReferenceStorageType.so
  ) {
    const { externalReferenceId, ...restAttachment } = attachment;
    return restAttachment;
  }

  return attachment;
};

const createAttachmentFrameworkSOReference = (
  attachment: CommentUserAction['payload']['comment']
): SavedObjectReference[] => {
  if (
    attachment.type === CommentType.externalReference &&
    attachment.externalReferenceStorage.type === ExternalReferenceStorageType.so
  ) {
    return [
      {
        id: attachment.externalReferenceId,
        name: EXTERNAL_REFERENCE_REF_NAME,
        type: attachment.externalReferenceStorage.soType,
      },
    ];
  }

  return [];
};
