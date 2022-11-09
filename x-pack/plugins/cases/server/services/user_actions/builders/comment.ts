/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { extractPersistableStateReferencesFromSO } from '../../../attachment_framework/so_references';
import type { CommentUserAction } from '../../../../common/api';
import { ActionTypes, Actions } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, BuilderReturnValue } from '../types';
import { getAttachmentSOExtractor } from '../../so_references';

export class CommentUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'comment'>): BuilderReturnValue {
    const soExtractor = getAttachmentSOExtractor(args.payload.attachment);
    const { transformedFields, references: refsWithExternalRefId } =
      soExtractor.extractFieldsToReferences<CommentUserAction['payload']['comment']>({
        data: args.payload.attachment,
      });

    const { attributes: extractedAttributes, references: extractedReferences } =
      extractPersistableStateReferencesFromSO(transformedFields, {
        persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
      });

    const commentUserAction = this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.update,
      valueKey: 'comment',
      value: { ...transformedFields, ...extractedAttributes },
      type: ActionTypes.comment,
    });

    return {
      ...commentUserAction,
      references: uniqBy(
        [...commentUserAction.references, ...refsWithExternalRefId, ...extractedReferences],
        'id'
      ),
    };
  }
}
