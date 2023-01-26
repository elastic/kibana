/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import moment from 'moment';

/**
 * A base class for creating a service that runs on a interval
 */
export class BaseRunningService {
  private nextRunId: ReturnType<typeof setTimeout> | undefined;
  private markRunComplete: (() => void) | undefined;

  protected wasStarted = false;

  /** Promise that remains pending while the service is running */
  public whileRunning: Promise<void> = Promise.resolve();

  protected readonly logPrefix: string;

  constructor(
    protected readonly esClient: Client,
    protected readonly kbnClient: KbnClient,
    protected readonly logger: ToolingLog = new ToolingLog(),
    protected readonly intervalMs: number = 30_000 // 30s
  ) {
    this.logPrefix = this.constructor.name ?? 'BaseRunningService';
    this.logger.verbose(`${this.logPrefix} run interval: [ ${this.intervalMs} ]`);
  }

  public get isRunning(): boolean {
    return this.wasStarted;
  }

  start() {
    if (this.wasStarted) {
      return;
    }

    this.wasStarted = true;
    this.whileRunning = new Promise((resolve) => {
      this.markRunComplete = () => resolve();
    });

    this.logger.verbose(`${this.logPrefix}: started at ${new Date().toISOString()}`);

    this.run().finally(() => {
      this.scheduleNextRun();
    });
  }

  stop() {
    if (this.wasStarted) {
      this.clearNextRun();
      this.wasStarted = false;

      if (this.markRunComplete) {
        this.markRunComplete();
        this.markRunComplete = undefined;
      }

      this.logger.verbose(`${this.logPrefix}: stopped at ${new Date().toISOString()}`);
    }
  }

  protected scheduleNextRun() {
    this.clearNextRun();

    if (this.wasStarted) {
      this.nextRunId = setTimeout(async () => {
        const startedAt = new Date();

        await this.run();

        const endedAt = new Date();

        this.logger.verbose(
          `${this.logPrefix}.run(): completed in ${moment
            .duration(moment(endedAt).diff(startedAt, 'seconds'))
            .as('seconds')}s`
        );
        this.logger.indent(4, () => {
          this.logger.verbose(`started at: ${startedAt.toISOString()}`);
          this.logger.verbose(`ended at:   ${startedAt.toISOString()}`);
        });

        this.scheduleNextRun();
      }, this.intervalMs);
    }
  }

  protected clearNextRun() {
    if (this.nextRunId) {
      clearTimeout(this.nextRunId);
      this.nextRunId = undefined;
    }
  }

  protected async run(): Promise<void> {
    throw new Error(`${this.logPrefix}.run() not implemented!`);
  }
}
