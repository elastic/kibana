/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_COMMENTS_PER_PAGE } from '../../../common/constants';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
} from '../../../common/utils/attachments';
import type { CommentRequest, FindCommentsQueryParams } from '../../../common/api';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import { validatePagination } from '../../common/validators';

export const validateRegisteredAttachments = ({
  query,
  persistableStateAttachmentTypeRegistry,
  externalReferenceAttachmentTypeRegistry,
}: {
  query: CommentRequest;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
}) => {
  if (
    isCommentRequestTypeExternalReference(query) &&
    !externalReferenceAttachmentTypeRegistry.has(query.externalReferenceAttachmentTypeId)
  ) {
    throw Boom.badRequest(
      `Attachment type ${query.externalReferenceAttachmentTypeId} is not registered.`
    );
  }

  if (
    isCommentRequestTypePersistableState(query) &&
    !persistableStateAttachmentTypeRegistry.has(query.persistableStateAttachmentTypeId)
  ) {
    throw Boom.badRequest(
      `Attachment type ${query.persistableStateAttachmentTypeId} is not registered.`
    );
  }
};

export const validateFindCommentsPagination = (params?: FindCommentsQueryParams) => {
  validatePagination({
    page: params?.page,
    perPage: params?.perPage,
    maxPerPage: MAX_COMMENTS_PER_PAGE,
  });
};
