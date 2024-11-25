/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RuleMigrationTaskCreateClientParams } from './types';
import { RuleMigrationsTaskClient } from './rule_migrations_task_client';

export type MigrationRunning = Map<string, { user: string; abortController: AbortController }>;

export class RuleMigrationsTaskService {
  private migrationsRunning: MigrationRunning;

  constructor(private logger: Logger) {
    this.migrationsRunning = new Map();
  }

  public createClient({
    currentUser,
    dataClient,
  }: RuleMigrationTaskCreateClientParams): RuleMigrationsTaskClient {
    return new RuleMigrationsTaskClient(
      this.migrationsRunning,
      this.logger,
      dataClient,
      currentUser
    );
  }

  /** Stops all running migrations */
  stopAll() {
    this.migrationsRunning.forEach((migrationRunning) => {
      migrationRunning.abortController.abort();
    });
    this.migrationsRunning.clear();
  }
}
