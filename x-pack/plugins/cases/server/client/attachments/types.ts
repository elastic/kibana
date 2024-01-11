/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkCreateAttachmentsRequest,
  AttachmentPatchRequest,
  AttachmentRequest,
  FindAttachmentsQueryParams,
} from '../../../common/types/api';

/**
 * The arguments needed for creating a new attachment to a case.
 */
export interface AddArgs {
  /**
   * The case ID that this attachment will be associated with
   */
  caseId: string;
  /**
   * The attachment values.
   */
  comment: AttachmentRequest;
}

export interface BulkCreateArgs {
  caseId: string;
  attachments: BulkCreateAttachmentsRequest;
}

/**
 * Parameters for deleting all comments of a case.
 */
export interface DeleteAllArgs {
  /**
   * The case ID to delete all attachments for
   */
  caseID: string;
}

/**
 * Parameters for deleting a file attachment.
 */
export interface BulkDeleteFileArgs {
  /**
   * The id of the case
   */
  caseId: string;
  /**
   * The ids of the file saved objects
   */
  fileIds: string[];
}

/**
 * Parameters for deleting a single attachment of a case.
 */
export interface DeleteArgs {
  /**
   * The case ID to delete an attachment from
   */
  caseID: string;
  /**
   * The attachment ID to delete
   */
  attachmentID: string;
}

/**
 * Parameters for finding attachments of a case
 */
export interface FindCommentsArgs {
  /**
   * The case ID for finding associated attachments
   */
  caseID: string;
  /**
   * Optional parameters for filtering the returned attachments
   */
  findQueryParams?: FindAttachmentsQueryParams;
}

/**
 * Parameters for retrieving all attachments of a case
 */
export interface GetAllArgs {
  /**
   * The case ID to retrieve all attachments for
   */
  caseID: string;
}

export interface GetArgs {
  /**
   * The ID of the case to retrieve an attachment from
   */
  caseID: string;
  /**
   * The ID of the attachment to retrieve
   */
  attachmentID: string;
}

export interface BulkGetArgs {
  caseID: string;
  /**
   * The ids of the attachments
   */
  attachmentIDs: string[];
}

export interface GetAllAlertsAttachToCase {
  /**
   * The ID of the case to retrieve the alerts from
   */
  caseId: string;
}

/**
 * Parameters for updating a single attachment
 */
export interface UpdateArgs {
  /**
   * The ID of the case that is associated with this attachment
   */
  caseID: string;
  /**
   * The full attachment request with the fields updated with appropriate values
   */
  updateRequest: AttachmentPatchRequest;
}
