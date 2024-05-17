/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { charts as kubernetesNodeCharts } from '../../../kubernetes/node/metrics';
import { cpu } from './cpu';
import { disk } from './disk';
import { logs } from './logs';
import { memory } from './memory';
import { network } from './network';

export const charts = {
  cpu,
  disk,
  memory,
  network,
  logs,
  kibernetesNode: kubernetesNodeCharts.node,
} as const;

export type HostCharts = typeof charts;
