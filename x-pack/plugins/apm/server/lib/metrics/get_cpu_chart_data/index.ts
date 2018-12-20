/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MetricsRequestArgs } from '../query_types';
import { fetch } from './fetcher';
import { CPUChartAPIResponse, transform } from './transformer';

export { CPUChartAPIResponse };

export async function getCPUChartData(args: MetricsRequestArgs) {
  const result = await fetch(args);
  return transform(result);
}
