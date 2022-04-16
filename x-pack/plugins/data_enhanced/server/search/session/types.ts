/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { Observable } from 'rxjs';
import { KueryNode, SearchSessionSavedObjectAttributes } from '@kbn/data-plugin/common';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { ConfigSchema } from '../../../config';

export enum SearchStatus {
  IN_PROGRESS = 'in_progress',
  ERROR = 'error',
  COMPLETE = 'complete',
}

export type SearchSessionsConfig = ConfigSchema['search']['sessions'];

export interface CheckSearchSessionsDeps {
  savedObjectsClient: SavedObjectsClientContract;
  client: ElasticsearchClient;
  logger: Logger;
}

export interface SearchSessionTaskSetupDeps {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config: ConfigSchema;
}

export interface SearchSessionTaskStartDeps {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  config: ConfigSchema;
}

export type SearchSessionTaskFn = (
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfig
) => Observable<void>;

export type SearchSessionsResponse = SavedObjectsFindResponse<
  SearchSessionSavedObjectAttributes,
  unknown
>;

export type CheckSearchSessionsFn = (
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfig,
  filter: KueryNode,
  page: number
) => Observable<SearchSessionsResponse>;
