/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileServiceStart } from '@kbn/files-plugin/server';
import { CommentType } from '../../../../common/api';
import type { CommentRequest } from '../../../../common/api';
import { MAX_FILES_PER_CASE } from '../../../../common/constants';
import { isFileAttachmentRequest } from '../../utils';
import { BaseLimiter } from '../base_limiter';

export class FileLimiter extends BaseLimiter {
  constructor(private readonly fileService: FileServiceStart) {
    super({
      limit: MAX_FILES_PER_CASE,
      attachmentType: CommentType.externalReference,
      field: 'externalReferenceAttachmentTypeId',
      attachmentNoun: 'files',
    });
  }

  public async countOfItemsWithinCase(caseId: string): Promise<number> {
    const files = await this.fileService.find({
      perPage: 1,
      meta: {
        caseIds: [caseId],
      },
    });

    return files.total;
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
