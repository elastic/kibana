/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponse, CommentRequest as AttachmentsRequest } from '../../../common/api';
import { CasesSubClientImplementation } from '../types';
import { addComment } from './add';

export interface AttachmentsAdd {
  caseId: string;
  comment: AttachmentsRequest;
}

export interface AttachmentsSubClient {
  add(args: AttachmentsAdd): Promise<CaseResponse>;
}

export const createAttachmentsSubClient: CasesSubClientImplementation<AttachmentsSubClient> = (
  args,
  getClientsFactories
) => {
  const { getCasesInternalClient } = getClientsFactories;
  const attachmentSubClient: AttachmentsSubClient = {
    add: ({ caseId, comment }: AttachmentsAdd) =>
      addComment({
        ...args,
        getCasesInternalClient,
        caseId,
        comment,
      }),
  };

  return Object.freeze(attachmentSubClient);
};
