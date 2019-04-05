/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Snapshot {
  id: string;
  summary: SnapshotSummary;
  repositories: string[];
}

export interface SnapshotSummary {
  status: string;
  start_epoch: string; // e.g. '1554501400'. This and other numerical values are typed as strings.
  start_time: string; // e.g. '21:56:40'
  end_epoch: string;
  end_time: string; // e.g. '21:56:45'
  duration: string; // Includes unit, e.g. '4.7s'
  indices: string;
  successful_shards: string;
  failed_shards: string;
  total_shards: string;
}

export interface SnapshotDetails {
  snapshot: string;
  uuid: string;
  version_id: number;
  version: string;
  indices: string[];
  include_global_state: boolean;
  state: string;
  start_time: string; // e.g. '2019-04-05T21:56:40.438Z'
  start_time_in_millis: number;
  end_time: string; // e.g. '2019-04-05T21:56:45.210Z'
  end_time_in_millis: number;
  duration_in_millis: number;
  failures: string[];
  shards: SnapshotDetailsShardsStatus;
}

export interface SnapshotDetailsShardsStatus {
  total: number;
  failed: number;
  successful: number;
}
