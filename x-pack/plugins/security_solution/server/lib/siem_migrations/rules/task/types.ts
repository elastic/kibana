/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, SavedObjectsClientContract } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { getRuleMigrationAgent } from './agent';

export type MigrationAgent = ReturnType<typeof getRuleMigrationAgent>;

export interface RuleMigrationTaskCreateClientParams {
  currentUser: AuthenticatedUser;
  dataClient: RuleMigrationsDataClient;
}

export interface RuleMigrationTaskStartParams {
  migrationId: string;
  connectorId: string;
  invocationConfig: RunnableConfig;
  inferenceClient: InferenceClient;
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  soClient: SavedObjectsClientContract;
}

export interface RuleMigrationTaskPrepareParams {
  migrationId: string;
  connectorId: string;
  inferenceClient: InferenceClient;
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  soClient: SavedObjectsClientContract;
  abortController: AbortController;
}

export interface RuleMigrationTaskRunParams {
  migrationId: string;
  invocationConfig: RunnableConfig;
  agent: MigrationAgent;
  abortController: AbortController;
}

export interface RuleMigrationTaskStartResult {
  started: boolean;
  exists: boolean;
}

export interface RuleMigrationTaskStopResult {
  stopped: boolean;
  exists: boolean;
}
