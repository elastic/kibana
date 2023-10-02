/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkResponse,
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { AttachmentType } from '../../../common';
import type { AttachmentAttributes, AttachmentPatchAttributes } from '../../../common/types/domain';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { PartialField } from '../../types';
import type { IndexRefresh } from '../types';

export interface ServiceContext {
  log: Logger;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

export interface AttachedToCaseArgs {
  caseId: string;
  filter?: KueryNode;
}

export interface GetAttachmentArgs {
  attachmentId: string;
}

export type OptionalAttributes<T> = PartialField<SavedObject<T>, 'attributes'>;

export interface BulkOptionalAttributes<T>
  extends Omit<SavedObjectsBulkResponse<T>, 'saved_objects'> {
  saved_objects: Array<OptionalAttributes<T>>;
}

export type GetAllAlertsAttachToCaseArgs = AttachedToCaseArgs;

export interface AlertIdsAggsResult {
  alertIds: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export type AlertsAttachedToCaseArgs = AttachedToCaseArgs;

export interface AttachmentsAttachedToCaseArgs extends AttachedToCaseArgs {
  attachmentType: AttachmentType;
  aggregations: Record<string, estypes.AggregationsAggregationContainer>;
}

export interface CountActionsAttachedToCaseArgs extends AttachedToCaseArgs {
  aggregations: Record<string, estypes.AggregationsAggregationContainer>;
}

export interface DeleteAttachmentArgs extends IndexRefresh {
  attachmentIds: string[];
}

export interface CreateAttachmentArgs extends IndexRefresh {
  attributes: AttachmentAttributes;
  references: SavedObjectReference[];
  id: string;
}

export interface BulkCreateAttachments extends IndexRefresh {
  attachments: Array<{
    attributes: AttachmentAttributes;
    references: SavedObjectReference[];
    id: string;
  }>;
}

export interface UpdateArgs {
  attachmentId: string;
  updatedAttributes: AttachmentPatchAttributes;
  options?: Omit<SavedObjectsUpdateOptions<AttachmentAttributes>, 'upsert'>;
}

export type UpdateAttachmentArgs = UpdateArgs;

export interface BulkUpdateAttachmentArgs extends IndexRefresh {
  comments: UpdateArgs[];
}
