/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from './user';

interface AttachmentCommonPersistedAttributes {
  created_at: string;
  created_by: User;
  owner: string;
  pushed_at: string | null;
  pushed_by: User | null;
  updated_at: string | null;
  updated_by: User | null;
}

export interface AttachmentRequestAttributes {
  type: string;
  alertId?: string | string[];
  index?: string | string[];
  rule?: Record<string, unknown>;
  comment?: string;
  actions?: Record<string, unknown>;
  externalReferenceMetadata?: Record<string, unknown> | null;
  externalReferenceAttachmentTypeId?: string;
  externalReferenceStorage?: {
    type: string;
    soType?: string;
  };
  persistableStateAttachmentState?: Record<string, unknown>;
}

export type AttachmentPersistedAttributes = AttachmentRequestAttributes &
  AttachmentCommonPersistedAttributes;
