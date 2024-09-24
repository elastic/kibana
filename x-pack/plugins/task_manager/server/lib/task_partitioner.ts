/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'elastic-apm-node';
import { KibanaDiscoveryService } from '../kibana_discovery_service';
import { assignPodPartitions } from './assign_pod_partitions';

function range(start: number, end: number) {
  const nums: number[] = [];
  for (let i = start; i < end; ++i) {
    nums.push(i);
  }
  return nums;
}

export const MAX_PARTITIONS = 256;
export const CACHE_INTERVAL = 10000;

export interface TaskPartitionerConstructorOpts {
  kibanaDiscoveryService: KibanaDiscoveryService;
  kibanasPerPartition: number;
  podName: string;
  logger: Logger;
}
export class TaskPartitioner {
  private readonly allPartitions: number[];
  private readonly podName: string;
  private readonly kibanasPerPartition: number;
  private readonly logger: Logger;
  private kibanaDiscoveryService: KibanaDiscoveryService;
  private podPartitions: number[];
  private podPartitionsLastUpdated: number;

  constructor(opts: TaskPartitionerConstructorOpts) {
    this.allPartitions = range(0, MAX_PARTITIONS);
    this.podName = opts.podName;
    this.kibanasPerPartition = opts.kibanasPerPartition;
    this.kibanaDiscoveryService = opts.kibanaDiscoveryService;
    this.podPartitions = [];
    this.podPartitionsLastUpdated = Date.now() - CACHE_INTERVAL;
    this.logger = opts.logger;
  }

  getAllPartitions(): number[] {
    return this.allPartitions;
  }

  getPodName(): string {
    return this.podName;
  }

  getPodPartitions(): number[] {
    return this.podPartitions;
  }

  async getPartitions(): Promise<number[]> {
    const lastUpdated = new Date(this.podPartitionsLastUpdated).getTime();
    const now = Date.now();

    // update the pod partitions cache after 10 seconds or when no partitions were previously found
    if (now - lastUpdated >= CACHE_INTERVAL || this.podPartitions.length === 0) {
      try {
        const allPodNames = await this.getAllPodNames();
        this.podPartitions = assignPodPartitions({
          kibanasPerPartition: this.kibanasPerPartition,
          podName: this.podName,
          podNames: allPodNames,
          partitions: this.allPartitions,
        });
        this.podPartitionsLastUpdated = now;
      } catch (error) {
        this.logger.error(`Failed to load list of active kibana nodes: ${error.message}`);
        // return the cached value
        return this.podPartitions;
      }
    }
    return this.podPartitions;
  }

  private async getAllPodNames(): Promise<string[]> {
    const nodes = await this.kibanaDiscoveryService.getActiveKibanaNodes();
    return nodes.map((node) => node.attributes.id);
  }
}
