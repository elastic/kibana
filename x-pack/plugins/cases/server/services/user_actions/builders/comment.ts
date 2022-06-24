/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCommentRequestTypeExternalReferenceSO } from '../../../common/utils';
import { EXTERNAL_REFERENCE_REF_NAME } from '../../../common/constants';
import { ActionTypes, Actions, CommentUserAction } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import { UserActionParameters, BuilderReturnValue } from '../types';
import { SOReferenceExtractor } from '../../so_reference_extractor';

export class CommentUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'comment'>): BuilderReturnValue {
    const soExtractor = getSOExtractor(args.payload.attachment);
    const { transformedFields, references: refsWithExternalRefId } =
      soExtractor.extractFieldsToReferences<CommentUserAction['payload']['comment']>({
        data: args.payload.attachment,
      });

    const commentUserAction = this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.update,
      valueKey: 'comment',
      value: transformedFields,
      type: ActionTypes.comment,
    });

    return {
      ...commentUserAction,
      references: [...commentUserAction.references, ...refsWithExternalRefId],
    };
  }
}

const getSOExtractor = (attachment: CommentUserAction['payload']['comment']) => {
  const fieldsToExtract = [];

  if (isCommentRequestTypeExternalReferenceSO(attachment)) {
    fieldsToExtract.push({
      path: 'externalReferenceId',
      type: attachment.externalReferenceStorage.soType,
      name: EXTERNAL_REFERENCE_REF_NAME,
    });
  }

  return new SOReferenceExtractor(fieldsToExtract);
};
