/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { BACKGROUND_TASK_NODE_SO_NAME } from '../saved_objects';
import { BackgroundTaskNode } from '../saved_objects/schemas/background_task_node';
import { TaskManagerConfig } from '../config';

interface DiscoveryServiceParams {
  config: TaskManagerConfig['discovery'];
  currentNode: string;
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
}

interface DiscoveryServiceUpsertParams {
  id: string;
  lastSeen: string;
}

export class KibanaDiscoveryService {
  private readonly activeNodesLookBack: string;
  private readonly discoveryInterval: number;
  private currentNode: string;
  private started = false;
  private savedObjectsRepository: ISavedObjectsRepository;
  private logger: Logger;

  constructor({ config, currentNode, savedObjectsRepository, logger }: DiscoveryServiceParams) {
    this.activeNodesLookBack = config.active_nodes_lookback;
    this.discoveryInterval = config.interval;
    this.savedObjectsRepository = savedObjectsRepository;
    this.logger = logger;
    this.currentNode = currentNode;
  }

  private async upsertCurrentNode({ id, lastSeen }: DiscoveryServiceUpsertParams) {
    await this.savedObjectsRepository.update<BackgroundTaskNode>(
      BACKGROUND_TASK_NODE_SO_NAME,
      id,
      {
        id,
        last_seen: lastSeen,
      },
      { upsert: { id, last_seen: lastSeen }, refresh: false }
    );
  }

  private async scheduleUpsertCurrentNode() {
    const lastSeenDate = new Date();
    const lastSeen = lastSeenDate.toISOString();
    try {
      await this.upsertCurrentNode({ id: this.currentNode, lastSeen });
      if (!this.started) {
        this.logger.info('Kibana Discovery Service has been started');
        this.started = true;
      }
    } catch (e) {
      if (!this.started) {
        this.logger.error(
          `Kibana Discovery Service couldn't be started and will be retried in ${this.discoveryInterval}ms, error:${e.message}`
        );
      } else {
        this.logger.error(
          `Kibana Discovery Service couldn't update this node's last_seen timestamp. id: ${this.currentNode}, last_seen: ${lastSeen}, error:${e.message}`
        );
      }
    } finally {
      setTimeout(
        async () => await this.scheduleUpsertCurrentNode(),
        this.discoveryInterval - (Date.now() - lastSeenDate.getTime())
      );
    }
  }

  public isStarted() {
    return this.started;
  }

  public async start() {
    if (!this.started) {
      await this.scheduleUpsertCurrentNode();
    } else {
      this.logger.warn('Kibana Discovery Service has already been started');
    }
  }

  public async getActiveKibanaNodes() {
    const { saved_objects: activeNodes } =
      await this.savedObjectsRepository.find<BackgroundTaskNode>({
        type: BACKGROUND_TASK_NODE_SO_NAME,
        perPage: 10000,
        page: 1,
        filter: `${BACKGROUND_TASK_NODE_SO_NAME}.attributes.last_seen > now-${this.activeNodesLookBack}`,
      });

    return activeNodes;
  }

  public async deleteCurrentNode() {
    await this.savedObjectsRepository.delete(BACKGROUND_TASK_NODE_SO_NAME, this.currentNode);
    this.logger.info('Removed this node from the Kibana Discovery Service');
  }
}
