/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import type { AttachmentAttributes } from '../../../common/types/domain';
import { AttachmentAttributesRt, AttachmentPatchAttributesRt } from '../../../common/types/domain';
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
  rule?: {
    id: string | null;
    name: string | null;
  };
  comment?: string;
  actions?: {
    targets: Array<{
      hostname: string;
      endpointId: string;
    }>;
    type: string;
  };
  externalReferenceMetadata?: Record<string, JsonValue> | null;
  externalReferenceAttachmentTypeId?: string;
  externalReferenceStorage?: {
    type: string;
    soType?: string;
  };
  persistableStateAttachmentState?: Record<string, JsonValue>;
  persistableStateAttachmentTypeId?: string;
}

export type AttachmentPersistedAttributes = AttachmentRequestAttributes &
  AttachmentCommonPersistedAttributes;

export type AttachmentTransformedAttributes = AttachmentAttributes;
export type AttachmentSavedObjectTransformed = SavedObject<AttachmentTransformedAttributes>;

export const AttachmentTransformedAttributesRt = AttachmentAttributesRt;
export const AttachmentPartialAttributesRt = AttachmentPatchAttributesRt;
