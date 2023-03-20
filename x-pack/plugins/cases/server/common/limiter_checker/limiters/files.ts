/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../../../../common/api';
import type { CommentRequest } from '../../../../common/api';
import { isFileAttachmentRequest } from '../../utils';
import { BaseLimiter } from '../base_limiter';
import { MAX_FILES_PER_CASE } from '../../../files';
import { createSavedObjectFileFilter } from '../../../files/utils';

export class FileLimiter extends BaseLimiter {
  constructor() {
    super({
      limit: MAX_FILES_PER_CASE,
      attachmentType: CommentType.externalReference,
      field: 'externalReferenceMetadata.files.name.keyword',
      filter: createSavedObjectFileFilter(),
      attachmentNoun: 'files',
    });
  }

  public countOfItemsInRequest(requests: CommentRequest[]): number {
    let fileRequests = 0;

    for (const request of requests) {
      if (isFileAttachmentRequest(request)) {
        fileRequests += request.externalReferenceMetadata.files.length;
      }
    }

    return fileRequests;
  }
}
