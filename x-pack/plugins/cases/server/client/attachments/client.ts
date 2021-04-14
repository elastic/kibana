/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AllCommentsResponse,
  CaseResponse,
  CommentRequest as AttachmentsRequest,
  CommentResponse,
  CommentsResponse,
} from '../../../common/api';

import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '../types';
import { addComment } from './add';
import { DeleteAllArgs, deleteAll, DeleteArgs, deleteComment } from './delete';
import { find, FindArgs, get, getAll, GetAllArgs, GetArgs } from './get';
import { update, UpdateArgs } from './update';

interface AttachmentsAdd {
  caseId: string;
  comment: AttachmentsRequest;
}

export interface AttachmentsSubClient {
  add(args: AttachmentsAdd): Promise<CaseResponse>;
  deleteAll(deleteAllArgs: DeleteAllArgs): Promise<void>;
  delete(deleteArgs: DeleteArgs): Promise<void>;
  find(findArgs: FindArgs): Promise<CommentsResponse>;
  getAll(getAllArgs: GetAllArgs): Promise<AllCommentsResponse>;
  get(getArgs: GetArgs): Promise<CommentResponse>;
  update(updateArgs: UpdateArgs): Promise<CaseResponse>;
}

export const createAttachmentsSubClient = (
  args: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): AttachmentsSubClient => {
  const attachmentSubClient: AttachmentsSubClient = {
    add: ({ caseId, comment }: AttachmentsAdd) =>
      addComment({
        ...args,
        casesClientInternal,
        caseId,
        comment,
      }),
    deleteAll: (deleteAllArgs: DeleteAllArgs) => deleteAll(deleteAllArgs, args),
    delete: (deleteArgs: DeleteArgs) => deleteComment(deleteArgs, args),
    find: (findArgs: FindArgs) => find(findArgs, args),
    getAll: (getAllArgs: GetAllArgs) => getAll(getAllArgs, args),
    get: (getArgs: GetArgs) => get(getArgs, args),
    update: (updateArgs: UpdateArgs) => update(updateArgs, args),
  };

  return Object.freeze(attachmentSubClient);
};
