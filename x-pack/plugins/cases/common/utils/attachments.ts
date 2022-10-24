/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CommentRequest,
  CommentRequestExternalReferenceType,
  CommentRequestPersistableStateType,
} from '../api';
import { CommentType } from '../api';

/**
 * A type narrowing function for external reference attachments.
 */
export const isCommentRequestTypeExternalReference = (
  context: CommentRequest
): context is CommentRequestExternalReferenceType => {
  return context.type === CommentType.externalReference;
};

/**
 * A type narrowing function for persistable state attachments.
 */
export const isCommentRequestTypePersistableState = (
  context: Partial<CommentRequest>
): context is CommentRequestPersistableStateType => {
  return context.type === CommentType.persistableState;
};
