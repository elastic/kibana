/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ProfilingValueType {
  wallTime = 'wall_time',
  cpuTime = 'cpu_time',
}

export interface ProfileNode {
  id: string;
  name: string;
  value: number;
  count: number;
  children: string[];
}
