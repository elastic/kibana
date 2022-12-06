/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../../common/constants';
import { extractPersistableStateReferencesFromSO } from '../../../attachment_framework/so_references';
import type { CommentUserAction } from '../../../../common/api';
import { ActionTypes, Actions } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';
import { getAttachmentSOExtractor } from '../../so_references';
import { getPastTenseVerb } from './audit_logger_utils';

export class CommentUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'comment'>): UserActionEvent {
    const soExtractor = getAttachmentSOExtractor(args.payload.attachment);
    const { transformedFields, references: refsWithExternalRefId } =
      soExtractor.extractFieldsToReferences<CommentUserAction['payload']['comment']>({
        data: args.payload.attachment,
      });

    const { attributes: extractedAttributes, references: extractedReferences } =
      extractPersistableStateReferencesFromSO(transformedFields, {
        persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
      });

    const action = args.action ?? Actions.update;

    const commentUserAction = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'comment',
      value: { ...transformedFields, ...extractedAttributes },
      type: ActionTypes.comment,
    });

    const parameters = {
      ...commentUserAction,
      references: uniqBy(
        [...commentUserAction.references, ...refsWithExternalRefId, ...extractedReferences],
        'id'
      ),
    };

    const verb = getPastTenseVerb(action);

    const getMessage = (id?: string) =>
      `User ${verb} comment id: ${commentId(args.attachmentId)} for case id: ${
        args.caseId
      } - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: `case_user_action_${action}_comment`,
      savedObjectId: args.attachmentId ?? args.caseId,
      savedObjectType: CASE_COMMENT_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}

const commentId = (id?: string) => {
  return id ? id : 'unknown';
};
