/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest } from '../types/api';
import type {
  ExternalReferenceAttachmentPayload,
  PersistableStateAttachmentPayload,
} from '../types/domain';
import { AttachmentType } from '../types/domain';

/**
 * A type narrowing function for external reference attachments.
 */
export const isCommentRequestTypeExternalReference = (
  context: AttachmentRequest
): context is ExternalReferenceAttachmentPayload => {
  return context.type === AttachmentType.externalReference;
};

/**
 * A type narrowing function for persistable state attachments.
 */
export const isCommentRequestTypePersistableState = (
  context: Partial<AttachmentRequest>
): context is PersistableStateAttachmentPayload => {
  return context.type === AttachmentType.persistableState;
};
