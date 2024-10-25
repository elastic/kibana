/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import type { Subject } from 'rxjs';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';

export interface SiemRulesMigrationsSetupParams {
  esClusterClient: IClusterClient;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

export interface SiemRuleMigrationsGetClientParams {
  request: KibanaRequest;
  spaceId: string;
}

export interface RuleMigrationSearchParams {
  migration_id?: string;
}
export interface SiemRuleMigrationsClient {
  create: (body: RuleMigration[]) => Promise<BulkResponse>;
  search: (params: RuleMigrationSearchParams) => Promise<SearchResponse>;
}
