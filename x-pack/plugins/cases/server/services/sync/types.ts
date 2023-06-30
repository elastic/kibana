/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseStatuses } from '@kbn/cases-components';
import type { SavedObjectsClientContract, Logger, CoreStart } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { CasesClientFactory } from '../../client/factory';

export interface ServiceContext {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

export interface Sync {
  connectorId: string;
  caseId: string;
  externalId: string;
  lastSyncedAt: string;
}

export interface SyncApiKey {
  apiKey: string;
  apiKeyId: string;
}

// TODO: these should be imported from the stack connectors plugin
export interface JiraIncidentResponse {
  summary: string;
  description: string;
  status: {
    id: string;
  };
  id: string;
  key: string;
  updated: string;
}

// TODO: these should be imported from the stack connectors plugin
export interface Transition {
  id: string;
  name: string;
  statusId: string;
}

// TODO: these should be imported from the stack connectors plugin
export interface ExternalServiceTransitionsResponse {
  byName: Map<string, Transition>;
  byId: Map<string, Transition>;
  byStatusId: Map<string, Transition>;
}

export interface Mapping {
  mapping: MappingEntry[];
  externalToCase: Map<string, MappingEntry>;
  caseToExternal: Map<string, MappingEntry>;
}

export interface MappingEntry {
  key: string;
  caseField: string;
  translateToCase?: Map<string, unknown>;
  translateToExternal?: Map<unknown, string>;
}

export interface SyncTaskContext {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  logger: Logger;
  actionsPluginStart: ActionsPluginStart;
  casesClientFactory: CasesClientFactory;
  taskManagerStart?: TaskManagerStartContract;
  security: SecurityPluginStart;
  core: CoreStart;
}

export interface SyncFields {
  title: string;
  description: string;
  status: CaseStatuses;
}
