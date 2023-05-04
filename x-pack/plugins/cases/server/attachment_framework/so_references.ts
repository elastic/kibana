/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/types';
import { isCommentRequestTypePersistableState } from '../../common/utils/attachments';
import type { CommentRequest, CommentRequestPersistableStateType } from '../../common/api';
import type { PersistableStateAttachmentTypeRegistry } from './persistable_state_registry';

interface SavedObjectAttributesAndReferences {
  state: CommentRequestPersistableStateType;
  references: SavedObjectReference[];
}

interface ExtractDeps {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}

type InjectDeps = ExtractDeps;

export function extractPersistableStateReferences(
  state: CommentRequestPersistableStateType,
  deps: ExtractDeps
): SavedObjectAttributesAndReferences {
  const { persistableStateAttachmentState, persistableStateAttachmentTypeId } = state;

  if (!deps.persistableStateAttachmentTypeRegistry.has(persistableStateAttachmentTypeId)) {
    return { state, references: [] };
  }

  const attachment = deps.persistableStateAttachmentTypeRegistry.get(
    persistableStateAttachmentTypeId
  );

  const { state: extractedState, references: extractedReferences } = attachment.extract({
    persistableStateAttachmentState,
    persistableStateAttachmentTypeId,
  });

  return {
    state: { ...state, ...extractedState, persistableStateAttachmentTypeId },
    references: extractedReferences,
  };
}

export function injectPersistableReferences(
  { state, references = [] }: SavedObjectAttributesAndReferences,
  deps: InjectDeps
): CommentRequestPersistableStateType {
  const { persistableStateAttachmentState, persistableStateAttachmentTypeId } = state;

  if (!deps.persistableStateAttachmentTypeRegistry.has(persistableStateAttachmentTypeId)) {
    return state;
  }

  const attachment = deps.persistableStateAttachmentTypeRegistry.get(
    persistableStateAttachmentTypeId
  );

  const injectedState = attachment.inject(
    {
      persistableStateAttachmentState,
      persistableStateAttachmentTypeId,
    },
    references
  );

  return { ...state, ...injectedState, persistableStateAttachmentTypeId };
}

export const extractPersistableStateReferencesFromSO = <T extends CommentRequest>(
  attachmentAttributes: T,
  deps: ExtractDeps
) => {
  let attributes = { ...attachmentAttributes };
  let references: SavedObjectReference[] = [];

  if (isCommentRequestTypePersistableState(attachmentAttributes)) {
    const { state, references: extractedReferences } = extractPersistableStateReferences(
      attachmentAttributes,
      deps
    );

    references = [...references, ...extractedReferences];
    attributes = { ...attributes, ...state };
  }

  return { attributes, references };
};

export const injectPersistableReferencesToSO = <T extends Partial<CommentRequest>>(
  attachmentAttributes: T,
  references: SavedObjectReference[],
  deps: InjectDeps
) => {
  if (isCommentRequestTypePersistableState(attachmentAttributes)) {
    const injectedState = injectPersistableReferences(
      {
        state: attachmentAttributes,
        references,
      },
      deps
    );

    return { ...attachmentAttributes, ...injectedState };
  }

  return attachmentAttributes;
};
