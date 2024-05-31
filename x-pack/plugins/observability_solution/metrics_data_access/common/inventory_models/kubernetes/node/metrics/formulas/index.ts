/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeCpuCapacity, nodeCpuUsed } from './cpu';
import { nodeDiskCapacity, nodeDiskUsed } from './disk';
import { nodeMemoryCapacity, nodeMemoryUsed } from './memory';
import { nodePodCapacity, nodePodUsed } from './pod_capacity';

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
