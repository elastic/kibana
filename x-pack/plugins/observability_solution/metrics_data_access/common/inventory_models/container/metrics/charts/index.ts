/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpu } from './cpu';
import { memory } from './memory';

export const charts = {
  cpu,
  memory,
} as const;

export type ContainerCharts = typeof charts;
