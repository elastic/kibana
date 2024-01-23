/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeCpuCapacity } from './node_cpu_capacity';
import { nodeCpuUsed } from './node_cpu_used';
import { nodeDiskCapacity } from './node_disk_capacity';
import { nodeDiskUsed } from './node_disk_used';
import { nodeMemoryCapacity } from './node_memory_capacity';
import { nodeMemoryUsed } from './node_memory_used';
import { nodePodCapacity } from './node_pod_capacity';
import { nodePodUsed } from './node_pod_used';

export const formulas = {
  nodeCpuCapacity,
  nodeCpuUsed,
  nodeDiskCapacity,
  nodeDiskUsed,
  nodeMemoryCapacity,
  nodeMemoryUsed,
  nodePodCapacity,
  nodePodUsed,
};
