/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignPodPartitions } from './assign_pod_partitions';

function range(start: number, end: number) {
  const nums: number[] = [];
  for (let i = start; i < end; ++i) {
    nums.push(i);
  }
  return nums;
}

export const MAX_PARTITIONS = 256;

export class TaskPartitioner {
  private readonly podName: string;
  private readonly allPartitions: number[];

  constructor(podName: string) {
    this.allPartitions = range(0, MAX_PARTITIONS);
    this.podName = podName;
  }

  getAllPartitions(): number[] {
    return this.allPartitions;
  }

  getPodName(): string {
    return this.podName;
  }

  async getPartitions(): Promise<number[]> {
    const allPodNames = await this.getAllPodNames();
    const podPartitions = assignPodPartitions(this.podName, allPodNames, this.allPartitions);
    return podPartitions;
  }

  private async getAllPodNames(): Promise<string[]> {
    // hard coding these for now, until the disovery service is complete
    return Promise.resolve([this.podName, 'test-pod-2', 'test-pod-3']);
  }
}
