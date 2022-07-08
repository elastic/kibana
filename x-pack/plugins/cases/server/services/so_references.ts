/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUpdateResponse } from '@kbn/core/server';
import { SavedObject, SavedObjectReference } from '@kbn/core/types';
import { isEqual, uniqWith } from 'lodash';
import {
  CommentAttributesNoSO,
  CommentRequest,
  CommentAttributes,
  CommentPatchAttributes,
  CommentAttributesWithoutRefs,
} from '../../common/api';
import { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import {
  injectPersistableReferencesToSO,
  extractPersistableStateReferencesFromSO,
} from '../attachment_framework/so_references';
import { EXTERNAL_REFERENCE_REF_NAME } from '../common/constants';
import { isCommentRequestTypeExternalReferenceSO } from '../common/utils';
import { SOReferenceExtractor } from './so_reference_extractor';

export const getAttachmentSOExtractor = (attachment: Partial<CommentRequest>) => {
  const fieldsToExtract = [];

  if (isCommentRequestTypeExternalReferenceSO(attachment)) {
    fieldsToExtract.push({
      path: 'externalReferenceId',
      type: attachment.externalReferenceStorage.soType,
      name: EXTERNAL_REFERENCE_REF_NAME,
    });
  }

  return new SOReferenceExtractor(fieldsToExtract);
};

export const injectAttachmentSOAttributesFromRefs = (
  savedObject: SavedObject<CommentAttributesWithoutRefs>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
) => {
  const soExtractor = getAttachmentSOExtractor(savedObject.attributes);
  const so = soExtractor.populateFieldsFromReferences<CommentAttributes>(savedObject);
  const injectedAttributes = injectPersistableReferencesToSO(so.attributes, so.references, {
    persistableStateAttachmentTypeRegistry,
  });

  return { ...so, attributes: { ...so.attributes, ...injectedAttributes } };
};

export const injectAttachmentSOAttributesFromRefsForPatch = (
  updatedAttributes: CommentPatchAttributes,
  savedObject: SavedObjectsUpdateResponse<CommentAttributesWithoutRefs>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
) => {
  const soExtractor = getAttachmentSOExtractor(savedObject.attributes);
  const so = soExtractor.populateFieldsFromReferencesForPatch<CommentAttributes>({
    dataBeforeRequest: updatedAttributes,
    dataReturnedFromRequest: savedObject,
  });

  /**
   *  We don't allow partial updates of attachments attributes.
   * Consumers will always get state of the attachment.
   */
  const injectedAttributes = injectPersistableReferencesToSO(so.attributes, so.references ?? [], {
    persistableStateAttachmentTypeRegistry,
  });

  return {
    ...so,
    attributes: { ...so.attributes, ...injectedAttributes },
  } as SavedObjectsUpdateResponse<CommentAttributes>;
};

export const extractAttachmentSORefsFromAttributes = (
  attributes: CommentAttributes | CommentPatchAttributes,
  references: SavedObjectReference[],
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
) => {
  const soExtractor = getAttachmentSOExtractor(attributes);

  const {
    transformedFields,
    references: refsWithExternalRefId,
    didDeleteOperation,
  } = soExtractor.extractFieldsToReferences<CommentAttributesNoSO>({
    data: attributes,
    existingReferences: references,
  });

  const { attributes: extractedAttributes, references: extractedReferences } =
    extractPersistableStateReferencesFromSO(transformedFields, {
      persistableStateAttachmentTypeRegistry,
    });

  return {
    attributes: { ...transformedFields, ...extractedAttributes },
    references: getUniqueReferences([...refsWithExternalRefId, ...extractedReferences]),
    didDeleteOperation,
  };
};

export const getUniqueReferences = (references: SavedObjectReference[]) =>
  uniqWith(references, isEqual);
