/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobId } from './job';
import { ModelSizeStats } from './job_stats';

export interface ModelSnapshot {
  job_id: JobId;
  min_version: string;
  timestamp: number;
  description: string;
  snapshot_id: string;
  snapshot_doc_count: number;
  model_size_stats: ModelSizeStats;
  latest_record_time_stamp: number;
  latest_result_time_stamp: number;
  retain: boolean;
}
