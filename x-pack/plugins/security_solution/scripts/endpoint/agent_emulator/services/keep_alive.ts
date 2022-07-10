/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkInFleetAgent } from '../../common/fleet_services';
import {
  fetchEndpointMetadataList,
  sendEndpointMetadataUpdate,
} from '../../common/endpoint_metadata_services';
import { BaseRunningService } from './base_running_service';

export class AgentKeepAliveService extends BaseRunningService {
  protected async run(): Promise<void> {
    return this.runKeepAlive();
  }

  private async runKeepAlive() {
    const { logger: log, kbnClient, esClient } = this;

    log.verbose(`${this.logPrefix}.runKeepAlive() started: ${new Date().toISOString()}`);

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
          if (endpoints.page === 0) {
            log.verbose(
              `${this.logPrefix}.runKeepAlive() Number of endpoints to process: ${endpoints.total}`
            );
          }

          for (const endpoint of endpoints.data) {
            await Promise.all([
              checkInFleetAgent(esClient, endpoint.metadata.elastic.agent.id, {
                agentStatus: 'random',
                log,
              }),
              sendEndpointMetadataUpdate(esClient, endpoint.metadata.agent.id),
            ]);
          }
        }
      } while (hasMore);
    } catch (err) {
      log.error(
        `${this.logPrefix}.runKeepAlive() Error: ${err.message}. Use the '--verbose' option to see more.`
      );

      log.verbose(err);
    }

    log.verbose(`${this.logPrefix}.runKeepAlive() ended: ${new Date().toISOString()}`);

    this.setNextRun();
  }
}
