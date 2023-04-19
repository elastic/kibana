/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '../json';
import type { CommentType } from './common';

enum ExternalReferenceStorageType {
  savedObject = 'savedObject',
  elasticSearchDoc = 'elasticSearchDoc',
}

export interface ExternalReferenceBase {
  type: typeof CommentType.externalReference;
  externalReferenceMetadata: Record<string, JsonValue> | null;
  externalReferenceAttachmentTypeId: string;
  owner: string;
}

export interface ExternalReferenceSO extends ExternalReferenceBase {
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.savedObject;
    soType: string;
  };
}

export interface ExternalReference extends ExternalReferenceBase {
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.elasticSearchDoc;
  };
}
