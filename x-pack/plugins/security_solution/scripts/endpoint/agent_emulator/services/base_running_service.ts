/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';
import { Client } from '@elastic/elasticsearch';

export class BaseRunningService {
  private nextRunId: ReturnType<typeof setTimeout> | undefined;
  private markRunComplete: (() => void) | undefined;

  protected isRunning = false;

  public whileRunning: Promise<void> = Promise.resolve();

  protected readonly logPrefix: string;

  constructor(
    protected readonly esClient: Client,
    protected readonly kbnClient: KbnClient,
    protected readonly logger: ToolingLog = new ToolingLog(),
    protected readonly intervalMs: number = 30_000 // 30s
  ) {
    this.logPrefix = this.constructor.name ?? 'BaseRunningService';
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.whileRunning = new Promise((resolve) => {
      this.markRunComplete = () => resolve();
    });

    this.logger.verbose(`${this.logPrefix}: started at ${new Date().toISOString()}`);

    this.run();
  }

  stop() {
    if (this.isRunning) {
      this.clearNextRun();
      this.isRunning = false;

      if (this.markRunComplete) {
        this.markRunComplete();
        this.markRunComplete = undefined;
      }

      this.logger.verbose(`${this.logPrefix}: stopped at ${new Date().toISOString()}`);
    }
  }

  protected setNextRun() {
    this.clearNextRun();

    if (this.isRunning) {
      this.nextRunId = setTimeout(this.run.bind(this), this.intervalMs);
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
