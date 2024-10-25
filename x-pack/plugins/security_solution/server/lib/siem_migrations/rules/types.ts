/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, IClusterClient, KibanaRequest } from '@kbn/core/server';
import type { Subject } from 'rxjs';
import type {
  RuleMigration,
  RuleMigrationTaskStats,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationsDataClient } from './data_stream/rule_migrations_data_client';
import type { RuleMigrationTaskCancelResult, RuleMigrationTaskStartResult } from './task/types';

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

export interface SiemRuleMigrationsClient {
  data: RuleMigrationsDataClient;
  task: {
    start: (migrationId: string) => Promise<RuleMigrationTaskStartResult>;
    stats: (migrationId: string) => Promise<RuleMigrationTaskStats>;
    cancel: (migrationId: string) => Promise<RuleMigrationTaskCancelResult>;
  };
}
