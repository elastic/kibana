/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFilter } from '../../../client/utils';
import { CommentType, FILE_ATTACHMENT_TYPE } from '../../../../common/api';
import type { CommentRequest } from '../../../../common/api';
import { CASE_COMMENT_SAVED_OBJECT, MAX_FILES_PER_CASE } from '../../../../common/constants';
import { isFileAttachmentRequest } from '../../utils';
import { BaseLimiter } from '../base_limiter';

export class FileLimiter extends BaseLimiter {
  constructor() {
    super({
      limit: MAX_FILES_PER_CASE,
      attachmentType: CommentType.externalReference,
      field: 'externalReferenceAttachmentTypeId',
      filter: createFileFilter(),
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

const createFileFilter = () =>
  buildFilter({
    filters: FILE_ATTACHMENT_TYPE,
    field: 'externalReferenceAttachmentTypeId',
    operator: 'or',
    type: CASE_COMMENT_SAVED_OBJECT,
  });
