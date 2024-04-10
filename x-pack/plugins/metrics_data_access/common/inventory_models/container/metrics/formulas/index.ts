/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpuUsage } from './cpu';
import { memoryUsage } from './memory';

export const formulas = {
  cpuUsage,
  memoryUsage,
} as const;

export type ContainerFormulas = typeof formulas;
