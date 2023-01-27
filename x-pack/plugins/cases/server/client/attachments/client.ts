/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertResponse,
  AllCommentsResponse,
  BulkGetAttachmentsResponse,
  CaseResponse,
  CommentResponse,
  CommentsResponse,
} from '../../../common/api';
import type { CasesClient } from '../client';

import type { CasesClientInternal } from '../client_internal';
import type { CasesClientArgs } from '../types';
import { addComment } from './add';
import type {
  BulkCreateArgs,
  AddArgs,
  DeleteAllArgs,
  DeleteArgs,
  FindArgs,
  GetAllAlertsAttachToCase,
  GetAllArgs,
  GetArgs,
  UpdateArgs,
  BulkGetArgs,
} from './types';
import { bulkCreate } from './bulk_create';
import { deleteAll, deleteComment } from './delete';
import { find, get, getAll, getAllAlertsAttachToCase } from './get';
import { bulkGet } from './bulk_get';
import { update } from './update';

/**
 * API for interacting with the attachments to a case.
 */
export interface AttachmentsSubClient {
  /**
   * Adds an attachment to a case.
   */
  add(params: AddArgs): Promise<CaseResponse>;
  bulkCreate(params: BulkCreateArgs): Promise<CaseResponse>;
  bulkGet(params: BulkGetArgs): Promise<BulkGetAttachmentsResponse>;
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
  find(findArgs: FindArgs): Promise<CommentsResponse>;
  /**
   * Retrieves all alerts attach to a case given a single case ID
   */
  getAllAlertsAttachToCase(params: GetAllAlertsAttachToCase): Promise<AlertResponse>;
  /**
   * Gets all attachments for a single case.
   */
  getAll(getAllArgs: GetAllArgs): Promise<AllCommentsResponse>;
  /**
   * Retrieves a single attachment for a case.
   */
  get(getArgs: GetArgs): Promise<CommentResponse>;
  /**
   * Updates a specific attachment.
   *
   * The request must include all fields for the attachment. Even the fields that are not changing.
   */
  update(updateArgs: UpdateArgs): Promise<CaseResponse>;
}

/**
 * Creates an API object for interacting with attachments.
 *
 * @ignore
 */
export const createAttachmentsSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  casesClientInternal: CasesClientInternal
): AttachmentsSubClient => {
  const attachmentSubClient: AttachmentsSubClient = {
    add: (params: AddArgs) => addComment(params, clientArgs),
    bulkCreate: (params: BulkCreateArgs) => bulkCreate(params, clientArgs),
    bulkGet: (params) => bulkGet(params, clientArgs),
    deleteAll: (deleteAllArgs: DeleteAllArgs) => deleteAll(deleteAllArgs, clientArgs),
    delete: (deleteArgs: DeleteArgs) => deleteComment(deleteArgs, clientArgs),
    find: (findArgs: FindArgs) => find(findArgs, clientArgs),
    getAllAlertsAttachToCase: (params: GetAllAlertsAttachToCase) =>
      getAllAlertsAttachToCase(params, clientArgs, casesClient),
    getAll: (getAllArgs: GetAllArgs) => getAll(getAllArgs, clientArgs),
    get: (getArgs: GetArgs) => get(getArgs, clientArgs),
    update: (updateArgs: UpdateArgs) => update(updateArgs, clientArgs),
  };

  return Object.freeze(attachmentSubClient);
};
