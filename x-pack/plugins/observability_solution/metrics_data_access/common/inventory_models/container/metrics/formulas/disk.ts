/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { DISK_READ_IOPS_LABEL, DISK_WRITE_IOPS_LABEL } from '../../../shared/charts/constants';

export const dockerContainerDiskIORead: LensBaseLayer = {
  label: DISK_READ_IOPS_LABEL,
  value: "counter_rate(max(docker.diskio.read.ops), kql='docker.diskio.read.ops: *')",
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};

export const dockerContainerDiskIOWrite: LensBaseLayer = {
  label: DISK_WRITE_IOPS_LABEL,
  value: "counter_rate(max(docker.diskio.write.ops), kql='docker.diskio.write.ops: *')",
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};
