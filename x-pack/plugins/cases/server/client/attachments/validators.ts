/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
} from '../../../common/utils/attachments';
import type { CommentRequest, FindCommentsQueryParams } from '../../../common/api';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';

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
  if (params?.page == null && params?.perPage == null) {
    return;
  }

  const pageAsNumber = params.page ?? 0;
  const perPageAsNumber = params.perPage ?? 0;

  if (Math.max(pageAsNumber, perPageAsNumber, pageAsNumber * perPageAsNumber) > MAX_DOCS_PER_PAGE) {
    throw Boom.badRequest(
      'The number of documents is too high. Paginating through more than 10,000 documents is not possible.'
    );
  }
};
