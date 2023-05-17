/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertResponse,
  Comments,
  BulkGetAttachmentsResponse,
  Case,
  Comment,
  CommentsFindResponse,
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
  FindCommentsArgs,
  GetAllAlertsAttachToCase,
  GetAllArgs,
  GetArgs,
  UpdateArgs,
  BulkGetArgs,
  BulkDeleteFileArgs,
} from './types';
import { bulkCreate } from './bulk_create';
import { deleteAll, deleteComment } from './delete';
import { find, get, getAll, getAllAlertsAttachToCase } from './get';
import { bulkGet } from './bulk_get';
import { update } from './update';
import { bulkDeleteFileAttachments } from './bulk_delete';

/**
 * API for interacting with the attachments to a case.
 */
export interface AttachmentsSubClient {
  /**
   * Adds an attachment to a case.
   */
  add(params: AddArgs): Promise<Case>;
  bulkCreate(params: BulkCreateArgs): Promise<Case>;
  bulkGet(params: BulkGetArgs): Promise<BulkGetAttachmentsResponse>;
  /**
   * Deletes all attachments associated with a single case.
   */
  deleteAll(deleteAllArgs: DeleteAllArgs): Promise<void>;
  /**
   * Deletes a single attachment for a specific case.
   */
  delete(deleteArgs: DeleteArgs): Promise<void>;
  bulkDeleteFileAttachments(deleteArgs: BulkDeleteFileArgs): Promise<void>;
  /**
   * Retrieves all comments matching the search criteria.
   */
  find(findArgs: FindCommentsArgs): Promise<CommentsFindResponse>;
  /**
   * Retrieves all alerts attach to a case given a single case ID
   */
  getAllAlertsAttachToCase(params: GetAllAlertsAttachToCase): Promise<AlertResponse>;
  /**
   * Gets all attachments for a single case.
   */
  getAll(getAllArgs: GetAllArgs): Promise<Comments>;
  /**
   * Retrieves a single attachment for a case.
   */
  get(getArgs: GetArgs): Promise<Comment>;
  /**
   * Updates a specific attachment.
   *
   * The request must include all fields for the attachment. Even the fields that are not changing.
   */
  update(updateArgs: UpdateArgs): Promise<Case>;
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
    bulkGet: (params) => bulkGet(params, clientArgs, casesClient),
    delete: (params) => deleteComment(params, clientArgs),
    deleteAll: (params) => deleteAll(params, clientArgs),
    bulkDeleteFileAttachments: (params) =>
      bulkDeleteFileAttachments(params, clientArgs, casesClient),
    find: (params) => find(params, clientArgs),
    getAllAlertsAttachToCase: (params) => getAllAlertsAttachToCase(params, clientArgs, casesClient),
    getAll: (params) => getAll(params, clientArgs),
    get: (params) => get(params, clientArgs),
    update: (params) => update(params, clientArgs),
  };

  return Object.freeze(attachmentSubClient);
};
