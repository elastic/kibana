/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { AbortError, abortSignalToPromise } from '@kbn/kibana-utils-plugin/server';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationStats } from '../data_stream/rule_migrations_data_client';
import type { StoredRuleMigration } from '../types';
import type {
  RuleMigrationTaskStartParams,
  RuleMigrationTaskStartResult,
  RuleMigrationTaskStatsParams,
  RuleMigrationTaskCancelParams,
  RuleMigrationTaskCancelResult,
} from './types';

interface MigrationProcessing {
  abortController: AbortController;
  user: string;
}

interface RuleLogger {
  info: (msg: string) => void;
  debug: (msg: string) => void;
  error: (msg: string, error: Error) => void;
}
const getRuleLogger = (logger: Logger): RuleLogger => {
  const prefix = '[ruleMigrationsTask]: ';
  return {
    info: (msg) => logger.info(`${prefix}${msg}`),
    debug: (msg) => logger.debug(`${prefix}${msg}`),
    error: (msg, error) => logger.error(`${prefix}${msg}: ${error.message}`),
  };
};

const BATCH_SIZE = 2 as const;
const BATCH_SLEEP_MS = 10000 as const;

export class RuleMigrationsTaskRunner {
  private migrationsProcessing: Map<string, MigrationProcessing>;
  private logger: RuleLogger;

  constructor(logger: Logger) {
    this.migrationsProcessing = new Map();
    this.logger = getRuleLogger(logger);
  }

  /** Starts a rule migration task */
  async start({
    migrationId,
    currentUser,
    request,
    dataClient,
  }: RuleMigrationTaskStartParams): Promise<RuleMigrationTaskStartResult> {
    if (this.migrationsProcessing.has(migrationId)) {
      return { found: true, started: false }; // already processing
    }
    // Just in case some previous execution was interrupted without releasing
    await dataClient.releaseProcessing(migrationId);

    const stats = await dataClient.getStats(migrationId);
    if (stats.total === 0) {
      return { found: false, started: false };
    }
    if (stats.pending === 0) {
      return { found: true, started: false };
    }

    this.run({ migrationId, currentUser, request, dataClient });
    return { found: true, started: true };
  }

  private async run({
    migrationId,
    currentUser,
    request,
    dataClient,
  }: RuleMigrationTaskStartParams): Promise<void> {
    if (this.migrationsProcessing.has(migrationId)) {
      throw new Error(`Migration ${migrationId} is already being processed`);
    }

    const abortController = new AbortController();
    this.migrationsProcessing.set(migrationId, { abortController, user: currentUser.username });

    const abortPromise = abortSignalToPromise(abortController.signal);

    try {
      const sleep = async (ms: number) => {
        this.logger.info(`Sleeping ${ms / 1000}s before next iteration`);
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, ms)),
          abortPromise.promise,
        ]);
      };

      let isDone: boolean = false;
      do {
        const ruleMigrations = await dataClient.takePending(migrationId, BATCH_SIZE);
        this.logger.info(`Processing ${ruleMigrations.length} rule migrations`);

        await Promise.all(
          ruleMigrations.map(async (ruleMigration) => {
            const ruleMigrationResult = await dummyRuleMigrationGraph.invoke(ruleMigration);
            await dataClient.saveFinished(ruleMigrationResult);
          })
        );

        const { pending } = await dataClient.getStats(migrationId);
        isDone = pending === 0;
        if (!isDone) {
          await sleep(BATCH_SLEEP_MS);
        }
      } while (!isDone);
    } catch (error) {
      await dataClient.releaseProcessing(migrationId);

      if (error instanceof AbortError) {
        this.logger.info(`Abort signal received, migration ${migrationId} task stopped`);
        return;
      } else {
        this.logger.error(`Error processing migration ${migrationId}`, error);
      }
    } finally {
      this.migrationsProcessing.delete(migrationId);
      abortPromise.cleanup();
    }
  }

  /** Retries the status of a running migration */
  async stats({
    migrationId,
    dataClient,
  }: RuleMigrationTaskStatsParams): Promise<RuleMigrationTaskStats> {
    const stats = await dataClient.getStats(migrationId);
    const status = this.getTaskStatus(stats, migrationId);
    return {
      status,
      total: stats.total,
      finished: stats.finished,
      pending: stats.pending,
      processing: stats.processing,
      failed: stats.failed,
      last_iteration_at: stats.lastUpdatedAt,
    };
  }

  private getTaskStatus(
    stats: RuleMigrationStats,
    migrationId: string
  ): RuleMigrationTaskStats['status'] {
    if (this.migrationsProcessing.has(migrationId)) {
      return 'processing';
    }
    if (stats.pending === stats.total) {
      return 'not_started';
    }
    if (stats.finished === stats.total) {
      return 'done';
    }
    return 'cancelled';
  }

  /** Aborts a running migration */
  async cancel({
    migrationId,
    dataClient,
  }: RuleMigrationTaskCancelParams): Promise<RuleMigrationTaskCancelResult> {
    const migrationProcessing = this.migrationsProcessing.get(migrationId);
    if (migrationProcessing) {
      migrationProcessing.abortController.abort();
      return { found: true, cancelled: true };
    }

    const stats = await dataClient.getStats(migrationId);
    if (stats.total > 0) {
      return { found: true, cancelled: false };
    }
    return { found: false, cancelled: false };
  }

  /** Stops all running migrations */
  stop() {
    this.migrationsProcessing.forEach((migrationProcessing) => {
      migrationProcessing.abortController.abort();
    });
    this.migrationsProcessing.clear();
  }
}

const dummyRuleMigrationGraph = {
  invoke: async (ruleMigration: StoredRuleMigration): Promise<StoredRuleMigration> => {
    return new Promise((resolve) => {
      console.log('dummyRuleMigrationGraph start');
      setTimeout(() => {
        console.log('dummyRuleMigrationGraph resolved');
        resolve(ruleMigration);
      }, 5000);
    });
  },
};
