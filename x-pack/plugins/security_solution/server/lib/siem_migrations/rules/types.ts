/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  IClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { Subject } from 'rxjs';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleMigration,
  RuleMigrationAllTaskStats,
  RuleMigrationTaskStats,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationsDataClient } from './data_stream/rule_migrations_data_client';
import type { RuleMigrationTaskStopResult, RuleMigrationTaskStartResult } from './task/types';

export interface StoredRuleMigration extends RuleMigration {
  _id: string;
  _index: string;
}

export interface SiemRulesMigrationsSetupParams {
  esClusterClient: IClusterClient;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

export interface SiemRuleMigrationsCreateClientParams {
  request: KibanaRequest;
  currentUser: AuthenticatedUser | null;
  spaceId: string;
}

export interface SiemRuleMigrationsStartTaskParams {
  migrationId: string;
  connectorId: string;
  invocationConfig: RunnableConfig;
  inferenceClient: InferenceClient;
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  soClient: SavedObjectsClientContract;
}

export interface SiemRuleMigrationsClient {
  data: RuleMigrationsDataClient;
  task: {
    start: (params: SiemRuleMigrationsStartTaskParams) => Promise<RuleMigrationTaskStartResult>;
    stop: (migrationId: string) => Promise<RuleMigrationTaskStopResult>;
    getStats: (migrationId: string) => Promise<RuleMigrationTaskStats>;
    getAllStats: () => Promise<RuleMigrationAllTaskStats>;
  };
}
