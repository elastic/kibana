/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';
import { Client } from '@elastic/elasticsearch';
import { checkInFleetAgent } from '../common/fleet_services';
import {
  fetchEndpointMetadataList,
  sendEndpointMetadataUpdate,
} from '../common/endpoint_metadata_services';

export class AgentKeepAliveService {
  private isRunning = false;
  private nextRunId: ReturnType<typeof setTimeout> | undefined;

  public whileRunning: Promise<void> = Promise.resolve();
  private markRunComplete: (() => void) | undefined;

  constructor(
    private readonly esClient: Client,
    private readonly kbnClient: KbnClient,
    private readonly logger: ToolingLog = new ToolingLog(),
    private readonly intervalMs: number = 3 * 60_000 // 3 minutes (fleet considers an agent offline at 5 minutes)
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

    this.logger.verbose(`${this.loggerPrefix()}: started at ${new Date().toISOString()}`);

    await this.runKeepAlive();
  }

  async stop(): Promise<void> {
    if (this.isRunning) {
      this.clearNextRun();
      this.isRunning = false;

      if (this.markRunComplete) {
        this.markRunComplete();
        this.markRunComplete = undefined;
      }

      this.logger.verbose(`${this.loggerPrefix()}: stopped at ${new Date().toISOString()}`);
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
    const { logger: log, kbnClient, esClient } = this;

    log.verbose(`${this.loggerPrefix('runKeepAlive()')} started: ${new Date().toISOString()}`);

    let hasMore = true;
    let page = 0;

    try {
      do {
        const endpoints = await fetchEndpointMetadataList(kbnClient, {
          page: page++,
          pageSize: 100,
        });

        if (endpoints.data.length === 0) {
          hasMore = false;
        } else {
          for (const endpoint of endpoints.data) {
            await Promise.all([
              checkInFleetAgent(esClient, endpoint.metadata.elastic.agent.id),
              sendEndpointMetadataUpdate(esClient, endpoint.metadata.agent.id),
            ]);
          }
        }
      } while (hasMore);
    } catch (err) {
      log.error(
        `${this.loggerPrefix('runKeepAlive()')} Error: ${
          err.message
        }. Use the '--verbose' option to see more.`
      );

      log.verbose(err);
    }

    log.verbose(`${this.loggerPrefix('runKeepAlive()')}   ended: ${new Date().toISOString()}`);

    this.setNextRun();
  }
}
