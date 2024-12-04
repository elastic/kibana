/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import { AbortError, abortSignalToPromise } from '@kbn/kibana-utils-plugin/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  SiemMigrationTaskStatus,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { RuleMigrationDataStats } from '../data/rule_migrations_data_rules_client';
import { getRuleMigrationAgent } from './agent';
import type { MigrateRuleState } from './agent/types';
import type {
  MigrationAgent,
  RuleMigrationTaskPrepareParams,
  RuleMigrationTaskRunParams,
  RuleMigrationTaskStartParams,
  RuleMigrationTaskStartResult,
  RuleMigrationTaskStopResult,
} from './types';
import { ActionsClientChat } from './util/actions_client_chat';
import { IntegrationRetriever } from './util/integration_retriever';
import { retrievePrebuiltRulesMap } from './util/prebuilt_rules';
import { RuleResourceRetriever } from './util/rule_resource_retriever';

const ITERATION_BATCH_SIZE = 1 as const;
const ITERATION_SLEEP_SECONDS = 10 as const;

type MigrationsRunning = Map<string, { user: string; abortController: AbortController }>;

export class RuleMigrationsTaskClient {
  constructor(
    private migrationsRunning: MigrationsRunning,
    private logger: Logger,
    private data: RuleMigrationsDataClient,
    private currentUser: AuthenticatedUser
  ) {}

  /** Starts a rule migration task */
  async start(params: RuleMigrationTaskStartParams): Promise<RuleMigrationTaskStartResult> {
    const { migrationId } = params;
    if (this.migrationsRunning.has(migrationId)) {
      return { exists: true, started: false };
    }
    // Just in case some previous execution was interrupted without cleaning up
    await this.data.rules.updateStatus(
      migrationId,
      SiemMigrationStatus.PROCESSING,
      SiemMigrationStatus.PENDING,
      { refresh: true }
    );

    const { rules } = await this.data.rules.getStats(migrationId);
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
      this.logger.error(`Unexpected error running the migration ID:${migrationId}`, err);
    });

    return { exists: true, started: true };
  }

  private async prepare({
    migrationId,
    connectorId,
    inferenceClient,
    actionsClient,
    rulesClient,
    soClient,
    abortController,
  }: RuleMigrationTaskPrepareParams): Promise<MigrationAgent> {
    const prebuiltRulesMap = await retrievePrebuiltRulesMap({ soClient, rulesClient });
    const resourceRetriever = new RuleResourceRetriever(migrationId, this.data);
    const integrationRetriever = new IntegrationRetriever(this.data);

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
      resourceRetriever,
      integrationRetriever,
      logger: this.logger,
    });
    return agent;
  }

  private async run({
    migrationId,
    agent,
    invocationConfig,
    abortController,
  }: RuleMigrationTaskRunParams): Promise<void> {
    if (this.migrationsRunning.has(migrationId)) {
      // This should never happen, but just in case
      throw new Error(`Task already running for migration ID:${migrationId} `);
    }
    this.logger.info(`Starting migration ID:${migrationId}`);

    this.migrationsRunning.set(migrationId, { user: this.currentUser.username, abortController });
    const config: RunnableConfig = {
      ...invocationConfig,
      // signal: abortController.signal, // not working properly https://github.com/langchain-ai/langgraphjs/issues/319
    };

    const abortPromise = abortSignalToPromise(abortController.signal);

    try {
      const sleep = async (seconds: number) => {
        this.logger.debug(`Sleeping ${seconds}s for migration ID:${migrationId}`);
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, seconds * 1000)),
          abortPromise.promise,
        ]);
      };

      let isDone: boolean = false;
      do {
        const ruleMigrations = await this.data.rules.takePending(migrationId, ITERATION_BATCH_SIZE);
        this.logger.debug(
          `Processing ${ruleMigrations.length} rules for migration ID:${migrationId}`
        );

        await Promise.all(
          ruleMigrations.map(async (ruleMigration) => {
            this.logger.debug(`Starting migration of rule "${ruleMigration.original_rule.title}"`);
            try {
              const start = Date.now();

              const migrationResult: MigrateRuleState = await Promise.race([
                agent.invoke({ original_rule: ruleMigration.original_rule }, config),
                abortPromise.promise, // workaround for the issue with the langGraph signal
              ]);

              const duration = (Date.now() - start) / 1000;
              this.logger.debug(
                `Migration of rule "${ruleMigration.original_rule.title}" finished in ${duration}s`
              );

              await this.data.rules.saveCompleted({
                ...ruleMigration,
                elastic_rule: migrationResult.elastic_rule,
                translation_result: migrationResult.translation_result,
                comments: migrationResult.comments,
              });
            } catch (error) {
              if (error instanceof AbortError) {
                throw error;
              }
              this.logger.error(
                `Error migrating rule "${ruleMigration.original_rule.title}"`,
                error
              );
              await this.data.rules.saveError({
                ...ruleMigration,
                comments: [`Error migrating rule: ${error.message}`],
              });
            }
          })
        );

        this.logger.debug(`Batch processed successfully for migration ID:${migrationId}`);

        const { rules } = await this.data.rules.getStats(migrationId);
        isDone = rules.pending === 0;
        if (!isDone) {
          await sleep(ITERATION_SLEEP_SECONDS);
        }
      } while (!isDone);

      this.logger.info(`Finished migration ID:${migrationId}`);
    } catch (error) {
      await this.data.rules.releaseProcessing(migrationId);

      if (error instanceof AbortError) {
        this.logger.info(`Abort signal received, stopping migration ID:${migrationId}`);
        return;
      } else {
        this.logger.error(`Error processing migration ID:${migrationId}`, error);
      }
    } finally {
      this.migrationsRunning.delete(migrationId);
      abortPromise.cleanup();
    }
  }

  /** Updates all the rules in a migration to be re-executed */
  public async updateToRetry(migrationId: string): Promise<{ updated: boolean }> {
    if (this.migrationsRunning.has(migrationId)) {
      return { updated: false };
    }
    // Update all the rules in the migration to pending
    await this.data.rules.updateStatus(migrationId, undefined, SiemMigrationStatus.PENDING, {
      refresh: true,
    });
    return { updated: true };
  }

  /** Returns the stats of a migration */
  public async getStats(migrationId: string): Promise<RuleMigrationTaskStats> {
    const dataStats = await this.data.rules.getStats(migrationId);
    const status = this.getTaskStatus(migrationId, dataStats.rules);
    return { status, ...dataStats };
  }

  /** Returns the stats of all migrations */
  async getAllStats(): Promise<RuleMigrationTaskStats[]> {
    const allDataStats = await this.data.rules.getAllStats();
    return allDataStats.map((dataStats) => {
      const status = this.getTaskStatus(dataStats.id, dataStats.rules);
      return { status, ...dataStats };
    });
  }

  private getTaskStatus(
    migrationId: string,
    dataStats: RuleMigrationDataStats['rules']
  ): SiemMigrationTaskStatus {
    if (this.migrationsRunning.has(migrationId)) {
      return SiemMigrationTaskStatus.RUNNING;
    }
    if (dataStats.pending === dataStats.total) {
      return SiemMigrationTaskStatus.READY;
    }
    if (dataStats.completed + dataStats.failed === dataStats.total) {
      return SiemMigrationTaskStatus.FINISHED;
    }
    return SiemMigrationTaskStatus.STOPPED;
  }

  /** Stops one running migration */
  async stop(migrationId: string): Promise<RuleMigrationTaskStopResult> {
    try {
      const migrationRunning = this.migrationsRunning.get(migrationId);
      if (migrationRunning) {
        migrationRunning.abortController.abort();
        return { exists: true, stopped: true };
      }

      const { rules } = await this.data.rules.getStats(migrationId);
      if (rules.total > 0) {
        return { exists: true, stopped: false };
      }
      return { exists: false, stopped: false };
    } catch (err) {
      this.logger.error(`Error stopping migration ID:${migrationId}`, err);
      return { exists: true, stopped: false };
    }
  }
}
