/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M' | 'Y';

export interface Duration {
  value: number;
  unit: DurationUnit;
}

export interface ChartData {
  key: number;
  value: number | undefined;
}
