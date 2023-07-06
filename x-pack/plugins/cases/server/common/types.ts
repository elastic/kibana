/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectError } from '@kbn/core/types';
import type { KueryNode } from '@kbn/es-query';
import type {
  CommentAttributes,
  CommentRequestExternalReferenceSOType,
  FileAttachmentMetadata,
} from '../../common/api';

/**
 * This structure holds the alert ID and index from an alert comment
 */
export interface AlertInfo {
  id: string;
  index: string;
}

type FindOptions = Pick<
  SavedObjectsFindOptions,
  | 'defaultSearchOperator'
  | 'hasReferenceOperator'
  | 'perPage'
  | 'hasReference'
  | 'fields'
  | 'page'
  | 'search'
  | 'searchFields'
  | 'sortField'
  | 'sortOrder'
  | 'rootSearchFields'
>;

export type SavedObjectFindOptionsKueryNode = FindOptions & {
  filter?: KueryNode;
};

export type FileAttachmentRequest = Omit<
  CommentRequestExternalReferenceSOType,
  'externalReferenceMetadata'
> & {
  externalReferenceMetadata: FileAttachmentMetadata;
};

export type AttachmentSavedObject = SavedObject<CommentAttributes>;

export type SOWithErrors<T> = Omit<SavedObject<T>, 'attributes'> & { error: SavedObjectError };
