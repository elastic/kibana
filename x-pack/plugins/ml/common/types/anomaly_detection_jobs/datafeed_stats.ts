/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Node } from './job_stats';
import { DATAFEED_STATE } from '../../constants/states';

export interface DatafeedStats {
  datafeed_id: string;
  state: DATAFEED_STATE;
  node: Node;
  assignment_explanation: string;
  timing_stats: TimingStats;
}

interface TimingStats {
  job_id: string;
  search_count: number;
  bucket_count: number;
  total_search_time_ms: number;
  average_search_time_per_bucket_ms: number;
  exponential_average_search_time_per_hour_ms: number;
}
