/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SnapshotDetails {
  repository: string;
  snapshot: string;
  uuid: string;
  versionId: number;
  version: string;
  indices: string[];
  includeGlobalState: number;
  state: string;
  /** e.g. '2019-04-05T21:56:40.438Z' */
  startTime: string;
  startTimeInMillis: number;
  /** e.g. '2019-04-05T21:56:45.210Z' */
  endTime: string;
  endTimeInMillis: number;
  durationInMillis: number;
  indexFailures: any[];
  shards: SnapshotDetailsShardsStatus;
}

interface SnapshotDetailsShardsStatus {
  total: number;
  failed: number;
  successful: number;
}
