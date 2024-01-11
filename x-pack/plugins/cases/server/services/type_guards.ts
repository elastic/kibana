/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalReferenceSOAttachmentPayload } from '../../common/types/domain';
import { AttachmentType, ExternalReferenceStorageType } from '../../common/types/domain';
import type { AttachmentRequestAttributes } from '../common/types/attachments';

/**
 * A type narrowing function for external reference saved object attachments.
 */
export const isCommentRequestTypeExternalReferenceSO = (
  context: Partial<AttachmentRequestAttributes>
): context is ExternalReferenceSOAttachmentPayload => {
  return (
    context.type === AttachmentType.externalReference &&
    context.externalReferenceStorage?.type === ExternalReferenceStorageType.savedObject
  );
};
