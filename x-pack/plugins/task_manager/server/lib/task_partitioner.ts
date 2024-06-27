/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import * as k8s from '@kubernetes/client-node';
import { getPodPartitions } from './get_pod_partitions';

function range(start: number, end: number) {
  const nums: number[] = [];
  for (let i = start; i < end; ++i) {
    nums.push(i);
  }
  return nums;
}

// Routing works by a hash of the routing number
const SHARD_1 = '0';
const SHARD_2 = 'c';
const SHARD_3 = 'f';

const cacheExpiry = 10000;
let lastGet = Date.now();
let _allPodNames: string[];
async function getAllPodNamesFromCache(
  savedObjectsRepository: ISavedObjectsRepository
): Promise<string[]> {
  if (_allPodNames && _allPodNames.length > 0 && lastGet > Date.now() - cacheExpiry) {
    return _allPodNames;
  }
  const promise = savedObjectsRepository.find<{ podNames: string[] }>({
    type: 'all_pods',
    perPage: 1,
    sortField: 'created_at',
    sortOrder: 'desc',
  });
  const result = await promise;
  if (result.saved_objects.length === 0) {
    throw new Error('No pods found');
  } else {
    const { podNames } = result.saved_objects[0].attributes;
    _allPodNames = podNames;
  }
  lastGet = Date.now();
  return _allPodNames;
}

export class TaskPartitioner {
  private readonly enabled: boolean;
  private readonly manuallyProvidePodNames: boolean;
  private readonly podName: string;
  private readonly allPartitions: number[];
  private readonly k8sNamespace: string;
  private readonly k8sServiceLabelSelector: string;
  private readonly savedObjectsRepository: ISavedObjectsRepository;

  constructor(
    enabled: boolean,
    podName: string,
    k8sNamespace: string,
    k8sServiceLabelSelector: string,
    savedObjectsRepository: ISavedObjectsRepository,
    manuallyProvidePodNames: boolean
  ) {
    this.enabled = enabled;
    this.podName = podName;
    this.allPartitions = range(0, 360);
    this.k8sNamespace = k8sNamespace;
    this.k8sServiceLabelSelector = k8sServiceLabelSelector;
    this.savedObjectsRepository = savedObjectsRepository;
    this.manuallyProvidePodNames = manuallyProvidePodNames;
  }

  // TODO: Implement some form of caching
  async getPartitions(): Promise<number[]> {
    if (!this.enabled) {
      return this.allPartitions;
    }

    const allPodNames = await this.getAllPodNames();
    const podPartitions = getPodPartitions(this.podName, allPodNames, this.allPartitions, 2);
    return podPartitions;
  }

  async getRoutingNumbers(): Promise<string[]> {
    if (!this.enabled) {
      return [SHARD_1, SHARD_2, SHARD_3];
    }

    const allPodNames = Array.from(await this.getAllPodNames()).sort();

    // Less than 3 Kibanas, we'll query all the shards
    if (allPodNames.length < 3) {
      return [SHARD_1, SHARD_2, SHARD_3];
    }

    const maxMultiple = Math.floor(allPodNames.length / 3);
    if (allPodNames.indexOf(this.podName) <= maxMultiple) {
      const mod = allPodNames.indexOf(this.podName) % 3;
      switch (mod) {
        case 0:
          return [SHARD_1];
        case 1:
          return [SHARD_2];
        case 2:
          return [SHARD_3];
        default:
          throw new Error(`Unexepcted mod value: ${mod}`);
      }
    } else {
      // Last few Kibanas will query all shards so all get queried evenly
      return [SHARD_1, SHARD_2, SHARD_3];
    }
  }

  private async getAllPodNames(): Promise<string[]> {
    if (this.manuallyProvidePodNames) {
      // const result = await this.savedObjectsRepository.find<{ podNames: string[] }>({
      //   type: 'all_pods',
      //   perPage: 1,
      //   sortField: 'created_at',
      //   sortOrder: 'desc',
      // });
      // if (result.saved_objects.length === 0) {
      //   throw new Error('No pods found');
      // } else {
      //   const { podNames } = result.saved_objects[0].attributes;
      //   // eslint-disable-next-line no-console
      //   console.log('Pods found:', JSON.stringify(podNames));
      //   return podNames;
      // }
      try {
        return await getAllPodNamesFromCache(this.savedObjectsRepository);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Failed to get all pod names', e);
        throw e;
      }
    }

    const kc = new k8s.KubeConfig();

    kc.loadFromCluster();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const services = await k8sApi.listNamespacedService(
      this.k8sNamespace,
      undefined,
      undefined,
      undefined,
      undefined,
      this.k8sServiceLabelSelector
    );
    if (services.body.items.length !== 1) {
      throw new Error(`Expected to get 1 service, received ${services.body.items.length}`);
    }

    const serviceSelector = services.body.items[0].spec?.selector;
    if (serviceSelector === undefined) {
      throw new Error(
        `Service's selector is undefined, unable to determine pods that match an empty selector`
      );
    }

    // TODO: Don't just shove the role label in here...
    const podSelector = {
      ...serviceSelector,
      'kibana.k8s.elastic.co/role-background-tasks': 'true',
    };
    const podLabelSelector = Object.entries(podSelector)
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    const pods = await k8sApi.listNamespacedPod(
      this.k8sNamespace,
      undefined,
      undefined,
      undefined,
      undefined,
      podLabelSelector
    );
    return pods.body.items.map((item) => {
      if (item.metadata === undefined) {
        throw new Error(`Pod's metadata is undefined, unable to determine name`);
      }

      if (item.metadata.name === undefined) {
        throw new Error(`Pod's metadata.name is undefined, unable to determine name`);
      }

      return item.metadata!.name!;
    });
  }
}
