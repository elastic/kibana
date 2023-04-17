/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommentAttributes } from '../api';
import { CommentType } from '../api';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
} from './attachments';

describe('attachments utils', () => {
  describe('isCommentRequestTypeExternalReference', () => {
    const externalReferenceAttachment = {
      type: CommentType.externalReference as const,
    } as CommentAttributes;

    const commentTypeWithoutAlert = Object.values(CommentType).filter(
      (type) => type !== CommentType.externalReference
    );

    it('returns false for type: externalReference', () => {
      expect(isCommentRequestTypeExternalReference(externalReferenceAttachment)).toBe(true);
    });

    it.each(commentTypeWithoutAlert)('returns false for type: %s', (type) => {
      const attachment = {
        type,
      } as CommentAttributes;

      expect(isCommentRequestTypeExternalReference(attachment)).toBe(false);
    });
  });

  describe('isCommentRequestTypePersistableState', () => {
    const persistableStateAttachment = {
      type: CommentType.persistableState as const,
    } as CommentAttributes;

    const commentTypeWithoutAlert = Object.values(CommentType).filter(
      (type) => type !== CommentType.persistableState
    );

    it('returns false for type: persistableState', () => {
      expect(isCommentRequestTypePersistableState(persistableStateAttachment)).toBe(true);
    });

    it.each(commentTypeWithoutAlert)('returns false for type: %s', (type) => {
      const attachment = {
        type,
      } as CommentAttributes;

      expect(isCommentRequestTypePersistableState(attachment)).toBe(false);
    });
  });
});
