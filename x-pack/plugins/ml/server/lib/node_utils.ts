/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { MlNodeCount } from '../../common/types/ml_server_info';

export async function getMlNodeCount(client: IScopedClusterClient): Promise<MlNodeCount> {
  const body = await client.asInternalUser.nodes.info({
    filter_path: 'nodes.*.attributes',
  });

  let count = 0;
  if (typeof body.nodes === 'object') {
    Object.keys(body.nodes).forEach((k) => {
      if (body.nodes[k].attributes !== undefined) {
        const machineMemory = +body.nodes[k].attributes['ml.machine_memory'];
        if (machineMemory !== null && machineMemory > 0) {
          count++;
        }
      }
    });
  }

  const lazyNodeCount = await getLazyMlNodeCount(client);

  return { count, lazyNodeCount };
}

export async function getLazyMlNodeCount(client: IScopedClusterClient) {
  const body = await client.asInternalUser.cluster.getSettings({
    include_defaults: true,
    filter_path: '**.xpack.ml.max_lazy_ml_nodes',
  });

  const lazyMlNodesString: string | undefined = (
    body.defaults ||
    body.persistent ||
    body.transient ||
    {}
  ).xpack?.ml.max_lazy_ml_nodes;

  const count = lazyMlNodesString === undefined ? 0 : +lazyMlNodesString;

  if (count === 0 || isNaN(count)) {
    return 0;
  }

  return count;
}

export async function countJobsLazyStarting(
  client: IScopedClusterClient,
  startingJobsCount: number
) {
  const lazyMlNodesCount = await getLazyMlNodeCount(client);
  const { count: currentMlNodeCount } = await getMlNodeCount(client);

  const availableLazyMlNodes = lazyMlNodesCount ?? lazyMlNodesCount - currentMlNodeCount;

  let lazilyStartingJobsCount = startingJobsCount;

  if (startingJobsCount > availableLazyMlNodes) {
    if (lazyMlNodesCount > currentMlNodeCount) {
      lazilyStartingJobsCount = availableLazyMlNodes;
    }
  }

  const response = {
    availableLazyMlNodes,
    currentMlNodeCount,
    lazilyStartingJobsCount,
    totalStartingJobs: startingJobsCount,
  };

  return response;
}
