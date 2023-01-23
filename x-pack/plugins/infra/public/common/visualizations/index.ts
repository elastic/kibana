/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CPU, CPUCores, Memory, RX, TX, DiskIORead, DiskIOWrite } from './lens/hosts';

export { buildLensAttributes } from './lens/lens_visualization';

export const hostMetricsLensAttributes = {
  cpu: CPU,
  cpuCores: CPUCores,
  memory: Memory,
  rx: RX,
  tx: TX,
  diskIORead: DiskIORead,
  diskIOWrite: DiskIOWrite,
};

export type HostLensAttributesTypes = keyof typeof hostMetricsLensAttributes;
