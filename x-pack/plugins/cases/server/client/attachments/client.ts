/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AllCommentsResponse,
  CaseResponse,
  CommentResponse,
  CommentsResponse,
} from '../../../common/api';

import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '../types';
import { AddArgs, addComment } from './add';
import { DeleteAllArgs, deleteAll, DeleteArgs, deleteComment } from './delete';
import { find, FindArgs, get, getAll, GetAllArgs, GetArgs } from './get';
import { update, UpdateArgs } from './update';

export interface AttachmentsSubClient {
  add(params: AddArgs): Promise<CaseResponse>;
  deleteAll(deleteAllArgs: DeleteAllArgs): Promise<void>;
  delete(deleteArgs: DeleteArgs): Promise<void>;
  find(findArgs: FindArgs): Promise<CommentsResponse>;
  getAll(getAllArgs: GetAllArgs): Promise<AllCommentsResponse>;
  get(getArgs: GetArgs): Promise<CommentResponse>;
  update(updateArgs: UpdateArgs): Promise<CaseResponse>;
}

export const createAttachmentsSubClient = (
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): AttachmentsSubClient => {
  const attachmentSubClient: AttachmentsSubClient = {
    add: (params: AddArgs) => addComment(params, clientArgs, casesClientInternal),
    deleteAll: (deleteAllArgs: DeleteAllArgs) => deleteAll(deleteAllArgs, clientArgs),
    delete: (deleteArgs: DeleteArgs) => deleteComment(deleteArgs, clientArgs),
    find: (findArgs: FindArgs) => find(findArgs, clientArgs),
    getAll: (getAllArgs: GetAllArgs) => getAll(getAllArgs, clientArgs),
    get: (getArgs: GetArgs) => get(getArgs, clientArgs),
    update: (updateArgs: UpdateArgs) => update(updateArgs, clientArgs),
  };

  return Object.freeze(attachmentSubClient);
};
