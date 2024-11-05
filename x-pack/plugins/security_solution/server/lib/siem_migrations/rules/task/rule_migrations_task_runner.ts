/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { AbortError, abortSignalToPromise } from '@kbn/kibana-utils-plugin/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type {
  RuleMigrationAllTaskStats,
  RuleMigrationTaskStats,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationDataStats } from '../data_stream/rule_migrations_data_client';
import type {
  RuleMigrationTaskStartParams,
  RuleMigrationTaskStartResult,
  RuleMigrationTaskStatsParams,
  RuleMigrationTaskStopParams,
  RuleMigrationTaskStopResult,
  RuleMigrationTaskPrepareParams,
  RuleMigrationTaskRunParams,
  MigrationAgent,
  RuleMigrationAllTaskStatsParams,
} from './types';
import { getRuleMigrationAgent } from './agent';
import type { MigrateRuleState } from './agent/types';
import { retrievePrebuiltRulesMap } from './util/prebuilt_rules';
import { ActionsClientChat } from './util/actions_client_chat';

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

const ITERATION_BATCH_SIZE = 50 as const;
const ITERATION_SLEEP_SECONDS = 10 as const;

export class RuleMigrationsTaskRunner {
  private migrationsExecuting: Map<string, MigrationProcessing>;
  private taskLogger: RuleLogger;

  constructor(private logger: Logger) {
    this.migrationsExecuting = new Map();
    this.taskLogger = getRuleLogger(logger);
  }

  /** Starts a rule migration task */
  async start(params: RuleMigrationTaskStartParams): Promise<RuleMigrationTaskStartResult> {
    const { migrationId, dataClient } = params;
    if (this.migrationsExecuting.has(migrationId)) {
      return { exists: true, started: false };
    }
    // Just in case some previous execution was interrupted without releasing
    await dataClient.releaseProcessable(migrationId);

    const { rules } = await dataClient.getStats(migrationId);
    if (rules.total === 0) {
      return { exists: false, started: false };
    }
    if (rules.pending === 0) {
      return { exists: true, started: false };
    }

    const abortController = new AbortController();

    // Await the preparation to make sure the agent is created properly so the task can run
    const agent = await this.prepare({ ...params, abortController });

    // not awaiting the `run` promise to execute the task in the background
    this.run({ ...params, agent, abortController }).catch((err) => {
      // All errors in the `run` method are already catch, this should never happen, but just in case
      this.taskLogger.error(`Unexpected error running the migration ID:${migrationId}`, err);
    });

    return { exists: true, started: true };
  }

  private async prepare({
    connectorId,
    inferenceClient,
    actionsClient,
    rulesClient,
    soClient,
    abortController,
  }: RuleMigrationTaskPrepareParams): Promise<MigrationAgent> {
    const prebuiltRulesMap = await retrievePrebuiltRulesMap({ soClient, rulesClient });

    const actionsClientChat = new ActionsClientChat(connectorId, actionsClient, this.logger);
    const model = await actionsClientChat.createModel({
      signal: abortController.signal,
      temperature: 0.05,
    });

    const agent = getRuleMigrationAgent({
      connectorId,
      model,
      inferenceClient,
      prebuiltRulesMap,
      logger: this.logger,
    });
    return agent;
  }

  private async run({
    migrationId,
    agent,
    dataClient,
    currentUser,
    invocationConfig,
    abortController,
  }: RuleMigrationTaskRunParams): Promise<void> {
    if (this.migrationsExecuting.has(migrationId)) {
      // This should never happen, but just in case
      throw new Error(`Task already running for migration ID:${migrationId} `);
    }
    this.taskLogger.info(`Starting migration task for ID:${migrationId}`);

    this.migrationsExecuting.set(migrationId, { abortController, user: currentUser.username });
    const config: RunnableConfig = {
      ...invocationConfig,
      // signal: abortController.signal, // not working properly https://github.com/langchain-ai/langgraphjs/issues/319
    };

    const abortPromise = abortSignalToPromise(abortController.signal);

    try {
      const sleep = async (seconds: number) => {
        this.taskLogger.debug(`Sleeping ${seconds}s for migration ID:${migrationId}`);
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, seconds * 1000)),
          abortPromise.promise,
        ]);
      };

      let isDone: boolean = false;
      do {
        const ruleMigrations = await dataClient.takePending(migrationId, ITERATION_BATCH_SIZE);
        this.taskLogger.debug(
          `Processing ${ruleMigrations.length} rules for migration ID:${migrationId}`
        );

        await Promise.all(
          ruleMigrations.map(async (ruleMigration) => {
            this.taskLogger.debug(
              `Starting migration of rule "${ruleMigration.original_rule.title}"`
            );
            try {
              const start = Date.now();
              const ruleMigrationResult: MigrateRuleState = await agent.invoke(
                { original_rule: ruleMigration.original_rule },
                config
              );
              const duration = (Date.now() - start) / 1000;
              this.taskLogger.debug(
                `Migration of rule "${ruleMigration.original_rule.title}" finished in ${duration}s`
              );

              await dataClient.saveFinished({
                ...ruleMigration,
                elastic_rule: ruleMigrationResult.elastic_rule,
                translation_state: ruleMigrationResult.translation_state,
                comments: ruleMigrationResult.comments,
              });
            } catch (error) {
              if (error instanceof AbortError) {
                throw error;
              }
              this.taskLogger.error(
                `Error migrating rule "${ruleMigration.original_rule.title}"`,
                error
              );
              await dataClient.saveError({
                ...ruleMigration,
                comments: [`Error migrating rule: ${error.message}`],
              });
            }
          })
        );
        this.taskLogger.debug(`Batch processed successfully for migration ID:${migrationId}`);

        const { rules } = await dataClient.getStats(migrationId);
        isDone = rules.pending === 0;
        if (!isDone) {
          await sleep(ITERATION_SLEEP_SECONDS);
        }
      } while (!isDone);

      this.taskLogger.info(`Finished migration task for ID:${migrationId}`);
    } catch (error) {
      await dataClient.releaseProcessing(migrationId);

      if (error instanceof AbortError) {
        this.taskLogger.info(
          `Abort signal received, stopping task for migration ID:${migrationId}`
        );
        return;
      } else {
        this.taskLogger.error(`Error processing migration ID:${migrationId}`, error);
      }
    } finally {
      this.migrationsExecuting.delete(migrationId);
      abortPromise.cleanup();
    }
  }

  /** Returns the stats of a migration */
  async getStats({
    migrationId,
    dataClient,
  }: RuleMigrationTaskStatsParams): Promise<RuleMigrationTaskStats> {
    const dataStats = await dataClient.getStats(migrationId);
    const status = this.getTaskStatus(migrationId, dataStats.rules);
    return { status, ...dataStats };
  }

  /** Returns the stats of all migrations */
  async getAllStats({
    dataClient,
  }: RuleMigrationAllTaskStatsParams): Promise<RuleMigrationAllTaskStats> {
    const allDataStats = await dataClient.getAllStats();
    return allDataStats.map((dataStats) => {
      const status = this.getTaskStatus(dataStats.migration_id, dataStats.rules);
      return { status, ...dataStats };
    });
  }

  private getTaskStatus(
    migrationId: string,
    dataStats: RuleMigrationDataStats['rules']
  ): RuleMigrationTaskStats['status'] {
    if (this.migrationsExecuting.has(migrationId)) {
      return 'running';
    }
    if (dataStats.pending === dataStats.total) {
      return 'ready';
    }
    if (dataStats.finished + dataStats.failed === dataStats.total) {
      return 'done';
    }
    return 'stopped';
  }

  /** Aborts a running migration */
  async stop({
    migrationId,
    dataClient,
  }: RuleMigrationTaskStopParams): Promise<RuleMigrationTaskStopResult> {
    try {
      const migrationProcessing = this.migrationsExecuting.get(migrationId);
      if (migrationProcessing) {
        migrationProcessing.abortController.abort();
        return { exists: true, stopped: true };
      }

      const { rules } = await dataClient.getStats(migrationId);
      if (rules.total > 0) {
        return { exists: true, stopped: false };
      }
      return { exists: false, stopped: false };
    } catch (err) {
      this.taskLogger.error(`Error stopping migration ID:${migrationId}`, err);
      return { exists: true, stopped: false };
    }
  }

  /** Stops all running migrations */
  stopAll() {
    this.migrationsExecuting.forEach((migrationProcessing) => {
      migrationProcessing.abortController.abort();
    });
    this.migrationsExecuting.clear();
  }
}
