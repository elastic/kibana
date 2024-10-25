/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import type { RuleMigrationsDataClient } from '../data_stream/rule_migrations_data_client';

export interface RuleMigrationTaskStartParams {
  migrationId: string;
  currentUser: AuthenticatedUser;
  request: KibanaRequest;
  dataClient: RuleMigrationsDataClient;
}

export interface RuleMigrationTaskCancelParams {
  migrationId: string;
  dataClient: RuleMigrationsDataClient;
}

export interface RuleMigrationTaskStatsParams {
  migrationId: string;
  dataClient: RuleMigrationsDataClient;
}

export interface RuleMigrationTaskStartResult {
  started: boolean;
  found: boolean;
}

export interface RuleMigrationTaskCancelResult {
  cancelled: boolean;
  found: boolean;
}
