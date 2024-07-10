/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/logging';
import { BACKGROUND_TASK_NODE_SO_NAME } from './saved_objects';
import { BackgroundTaskNode } from './saved_objects/schemas/background_task_node';

interface DiscoveryServiceParams {
  currentNode: string;
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
}

interface DiscoveryServiceUpsertParams {
  id: string;
  lastSeen: string;
}

export class KibanaDiscoveryService {
  private currentNode: string;
  private started = false;
  private refreshInterval = 1000 * 10;
  private deleteInterval = 1000 * 60;
  private savedObjectsRepository: ISavedObjectsRepository;
  private logger: Logger;

  constructor({ currentNode, savedObjectsRepository, logger }: DiscoveryServiceParams) {
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
      { upsert: { id, last_seen: lastSeen } }
    );
  }

  private async deleteInactiveNodes() {
    const { saved_objects: inactiveNodes } =
      await this.savedObjectsRepository.find<BackgroundTaskNode>({
        type: BACKGROUND_TASK_NODE_SO_NAME,
        perPage: 10000,
        page: 1,
        filter: 'background_task_node.attributes.last_seen < now-5m',
      });

    if (inactiveNodes.length > 0) {
      const nodesToDelete = inactiveNodes.map((node) => ({
        type: BACKGROUND_TASK_NODE_SO_NAME,
        id: node.attributes.id,
      }));
      await this.savedObjectsRepository.bulkDelete(nodesToDelete, { force: true });
      this.logger.info(
        `Inactive Kibana nodes: ${nodesToDelete.map(
          (node) => node.id
        )}, have been successfully deleted`
      );
    }
  }

  private async scheduleDeleteInactiveNodes() {
    try {
      this.deleteInactiveNodes();
    } catch (e) {
      this.logger.error(`Deleting inactive nodes failed. error: ${e.message} `);
    } finally {
      setTimeout(async () => await this.scheduleDeleteInactiveNodes(), this.deleteInterval);
    }
  }

  private async scheduleUpsertCurrentNode() {
    const lastSeen = new Date().toISOString();
    try {
      await this.upsertCurrentNode({ id: this.currentNode, lastSeen });
    } catch (e) {
      this.logger.error(
        `Background Task Node couldn't be updated. id: ${this.currentNode}, last_seen: ${lastSeen}, error:${e.message}`
      );
    } finally {
      setTimeout(async () => await this.scheduleUpsertCurrentNode(), this.refreshInterval);
    }
  }

  public isStarted() {
    return this.started;
  }

  public async start() {
    if (!this.started) {
      Promise.allSettled([
        this.scheduleUpsertCurrentNode(),
        this.scheduleDeleteInactiveNodes(),
      ]).then(() => {
        this.started = true;
        this.logger.info('Kibana Discovery Service has been initialized');
      });
    } else {
      this.logger.warn('Kibana Discovery Service has already been initialized');
    }
  }

  public async getActiveKibanaNodes() {
    const { saved_objects: activeNodes } =
      await this.savedObjectsRepository.find<BackgroundTaskNode>({
        type: BACKGROUND_TASK_NODE_SO_NAME,
        perPage: 10000,
        page: 1,
        filter: 'background_task_node.attributes.last_seen > now-30s',
      });

    return activeNodes;
  }

  public async deleteCurrentNode() {
    try {
      await this.savedObjectsRepository.delete(BACKGROUND_TASK_NODE_SO_NAME, this.currentNode);
      this.logger.info('Current node has been deleted');
    } catch (e) {
      this.logger.error(`Deleting current node has been failed. error: ${e.message}`);
    }
  }
}
