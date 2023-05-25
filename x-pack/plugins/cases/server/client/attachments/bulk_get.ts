/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { partition } from 'lodash';
import { MAX_BULK_GET_ATTACHMENTS } from '../../../common/constants';
import type { BulkGetAttachmentsResponse, CommentAttributes } from '../../../common/api';
import {
  decodeWithExcessOrThrow,
  BulkGetAttachmentsResponseRt,
  BulkGetAttachmentsRequestRt,
} from '../../../common/api';
import { flattenCommentSavedObjects } from '../../common/utils';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';
import type { BulkGetArgs } from './types';
import type { BulkOptionalAttributes, OptionalAttributes } from '../../services/attachments/types';
import type { CasesClient } from '../client';
import type { AttachmentSavedObject, SOWithErrors } from '../../common/types';
import { partitionByCaseAssociation } from '../../common/partitioning';
import { decodeOrThrow } from '../../../common/api/runtime_types';

type AttachmentSavedObjectWithErrors = Array<SOWithErrors<CommentAttributes>>;

/**
 * Retrieves multiple attachments by id.
 */
export async function bulkGet(
  { attachmentIDs, caseID }: BulkGetArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<BulkGetAttachmentsResponse> {
  const {
    services: { attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const request = decodeWithExcessOrThrow(BulkGetAttachmentsRequestRt)({ ids: attachmentIDs });

    throwErrorIfIdsExceedTheLimit(request.ids);

    // perform an authorization check for the case
    await casesClient.cases.resolve({ id: caseID });

    const attachments = await attachmentService.getter.bulkGet(request.ids);

    const { validAttachments, attachmentsWithErrors, invalidAssociationAttachments } =
      partitionAttachments(caseID, attachments);

    const { authorized: authorizedAttachments, unauthorized: unauthorizedAttachments } =
      await authorization.getAndEnsureAuthorizedEntities({
        savedObjects: validAttachments,
        operation: Operations.bulkGetAttachments,
      });

    const errors = constructErrors({
      associationErrors: invalidAssociationAttachments,
      unauthorizedAttachments,
      soBulkGetErrors: attachmentsWithErrors,
      caseId: caseID,
    });

    const res = {
      attachments: flattenCommentSavedObjects(authorizedAttachments),
      errors,
    };

    return decodeOrThrow(BulkGetAttachmentsResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to bulk get attachments for case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}

const throwErrorIfIdsExceedTheLimit = (ids: string[]) => {
  if (ids.length > MAX_BULK_GET_ATTACHMENTS) {
    throw Boom.badRequest(
      `Maximum request limit of ${MAX_BULK_GET_ATTACHMENTS} attachments reached`
    );
  }
};

interface PartitionedAttachments {
  validAttachments: AttachmentSavedObject[];
  attachmentsWithErrors: AttachmentSavedObjectWithErrors;
  invalidAssociationAttachments: AttachmentSavedObject[];
}

const partitionAttachments = (
  caseId: string,
  attachments: BulkOptionalAttributes<CommentAttributes>
): PartitionedAttachments => {
  const [attachmentsWithoutErrors, errors] = partitionBySOError(attachments.saved_objects);
  const [caseAttachments, invalidAssociationAttachments] = partitionByCaseAssociation(
    caseId,
    attachmentsWithoutErrors
  );

  return {
    validAttachments: caseAttachments,
    attachmentsWithErrors: errors,
    invalidAssociationAttachments,
  };
};

const partitionBySOError = (attachments: Array<OptionalAttributes<CommentAttributes>>) =>
  partition(
    attachments,
    (attachment) => attachment.error == null && attachment.attributes != null
  ) as [AttachmentSavedObject[], AttachmentSavedObjectWithErrors];

const constructErrors = ({
  caseId,
  soBulkGetErrors,
  associationErrors,
  unauthorizedAttachments,
}: {
  caseId: string;
  soBulkGetErrors: AttachmentSavedObjectWithErrors;
  associationErrors: AttachmentSavedObject[];
  unauthorizedAttachments: AttachmentSavedObject[];
}): BulkGetAttachmentsResponse['errors'] => {
  const errors: BulkGetAttachmentsResponse['errors'] = [];

  for (const soError of soBulkGetErrors) {
    errors.push({
      error: soError.error.error,
      message: soError.error.message,
      status: soError.error.statusCode,
      attachmentId: soError.id,
    });
  }

  for (const attachment of associationErrors) {
    errors.push({
      error: 'Bad Request',
      message: `Attachment is not attached to case id=${caseId}`,
      status: 400,
      attachmentId: attachment.id,
    });
  }

  for (const unauthorizedAttachment of unauthorizedAttachments) {
    errors.push({
      error: 'Forbidden',
      message: `Unauthorized to access attachment with owner: "${unauthorizedAttachment.attributes.owner}"`,
      status: 403,
      attachmentId: unauthorizedAttachment.id,
    });
  }

  return errors;
};
