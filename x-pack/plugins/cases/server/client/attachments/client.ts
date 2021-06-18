/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentResponse } from '../../../common';

import { CasesClientInternal } from '../client_internal';
import { IAllCommentsResponse, ICaseResponse, ICommentsResponse } from '../typedoc_interfaces';
import { CasesClientArgs } from '../types';
import { AddArgs, addComment } from './add';
import { DeleteAllArgs, deleteAll, DeleteArgs, deleteComment } from './delete';
import { find, FindArgs, get, getAll, GetAllArgs, GetArgs } from './get';
import { update, UpdateArgs } from './update';

/**
 * API for interacting with the attachments to a case.
 */
export interface AttachmentsSubClient {
  /**
   * Adds an attachment to a case.
   */
  add(params: AddArgs): Promise<ICaseResponse>;
  /**
   * Deletes all attachments associated with a single case.
   */
  deleteAll(deleteAllArgs: DeleteAllArgs): Promise<void>;
  /**
   * Deletes a single attachment for a specific case.
   */
  delete(deleteArgs: DeleteArgs): Promise<void>;
  /**
   * Retrieves all comments matching the search criteria.
   */
  find(findArgs: FindArgs): Promise<ICommentsResponse>;
  /**
   * Gets all attachments for a single case.
   */
  getAll(getAllArgs: GetAllArgs): Promise<IAllCommentsResponse>;
  /**
   * Retrieves a single attachment for a case.
   */
  get(getArgs: GetArgs): Promise<CommentResponse>;
  /**
   * Updates a specific attachment.
   *
   * The request must include all fields for the attachment. Even the fields that are not changing.
   */
  update(updateArgs: UpdateArgs): Promise<ICaseResponse>;
}

/**
 * Creates an API object for interacting with attachments.
 *
 * @ignore
 */
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
