/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmulatorRunContext } from './emulator_run_context';

export class AgentKeepAliveService {
  private isRunning = false;
  private nextRunId: ReturnType<typeof setTimeout> | undefined;

  public whileRunning: Promise<void> = Promise.resolve();
  private markRunComplete: (() => void) | undefined;

  constructor(
    private readonly runContext: EmulatorRunContext,
    private readonly intervalMs: number = 10_000
  ) {}

  private loggerPrefix(append: string = '') {
    return `${this.constructor.name}${append ? '.' : ''}${append}`;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.whileRunning = new Promise((resolve) => {
      this.markRunComplete = () => resolve();
    });

    await this.runKeepAlive();

    this.runContext
      .getLogger()
      .verbose(`${this.loggerPrefix()}: started at ${new Date().toISOString()}`);
  }

  async stop(): Promise<void> {
    if (this.isRunning) {
      this.clearNextRun();
      this.isRunning = false;

      if (this.markRunComplete) {
        this.markRunComplete();
        this.markRunComplete = undefined;
      }

      this.runContext
        .getLogger()
        .verbose(`${this.loggerPrefix()}: stopped at ${new Date().toISOString()}`);
    }
  }

  private setNextRun() {
    this.clearNextRun();

    if (this.isRunning) {
      this.nextRunId = setTimeout(this.runKeepAlive.bind(this), this.intervalMs);
    }
  }

  private clearNextRun() {
    if (this.nextRunId) {
      clearTimeout(this.nextRunId);
      this.nextRunId = undefined;
    }
  }

  private async runKeepAlive() {
    const log = this.runContext.getLogger();

    log.verbose(`${this.loggerPrefix('runKeepAlive()')} started: ${new Date().toISOString()}`);

    // FIXME: process here

    // 1. Retrieve endpoints
    // 2. for each Endpoint:
    //    a. send a checkin message to fleet
    //    b. send a metadata update

    // INFO:
    // How Fleet calculates different types of Agent status: https://github.com/elastic/kibana/blob/14c640573c18d0c47ad397662a68a330f12cfcd1/x-pack/plugins/fleet/common/services/agent_status.ts#L13-L44

    log.verbose(`${this.loggerPrefix('runKeepAlive()')}   ended: ${new Date().toISOString()}`);

    this.setNextRun();
  }
}
