/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';

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
