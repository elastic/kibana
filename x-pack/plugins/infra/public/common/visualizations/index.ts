/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpu, cpuCores, memory, rx, tx, diskIORead, diskIOWrite } from './lens/hosts';

export { buildLensAttributes } from './lens/lens_visualization';

export const hostMetricsLensAttributes = {
  cpu,
  cpuCores,
  memory,
  rx,
  tx,
  diskIORead,
  diskIOWrite,
};

export type HostLensAttributesTypes = keyof typeof hostMetricsLensAttributes;
