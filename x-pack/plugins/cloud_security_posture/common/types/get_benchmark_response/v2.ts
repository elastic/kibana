/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Benchmark as BenchmarkV1 } from '../benchmarks/v1';
import { Benchmark as BenchmarkV2 } from '../latest';

export interface GetBenchmarkResponse {
  items: BenchmarkV2[];
  items_policies_information: BenchmarkV1[];
  total: number;
  page: number;
  perPage: number;
}
