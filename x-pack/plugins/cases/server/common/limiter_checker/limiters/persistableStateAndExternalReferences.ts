/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentService } from '../../../services';
import { CommentType } from '../../../../common/api';
import type { CommentRequest } from '../../../../common/api';
import { MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES } from '../../../../common/constants';
import { isFileAttachmentRequest, isPersistableStateOrExternalReference } from '../../utils';
import { BaseLimiter } from '../base_limiter';

export class PersistableStateAndExternalReferencesLimiter extends BaseLimiter {
  constructor(private readonly attachmentService: AttachmentService) {
    super({
      limit: MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES,
      attachmentType: [CommentType.persistableState, CommentType.externalReference],
      attachmentNoun: 'persistable state and external reference attachments',
    });
  }

  public async countOfItemsWithinCase(caseId: string): Promise<number> {
    return this.attachmentService.countPersistableStateAndExternalReferenceAttachments({
      caseId,
    });
  }

  public countOfItemsInRequest(requests: CommentRequest[]): number {
    const totalReferences = requests
      .filter(isPersistableStateOrExternalReference)
      .filter((request) => !isFileAttachmentRequest(request));

    return totalReferences.length;
  }
}
