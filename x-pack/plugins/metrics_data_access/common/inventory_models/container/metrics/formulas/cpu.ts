/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { CPU_USAGE_LABEL } from '../../../shared/charts/constants';

export const cpuUsage: LensBaseLayer = {
  label: CPU_USAGE_LABEL,
  value: 'average(docker.cpu.total.pct)',
  format: 'percent',
  decimals: 1,
};
