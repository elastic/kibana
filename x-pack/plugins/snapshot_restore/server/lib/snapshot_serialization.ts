/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotDetails, SnapshotSummary } from '../../common/types';
import { SnapshotDetailsEs, SnapshotSummaryEs } from '../types';

export function deserializeSnapshotSummary(snapshotSummaryEs: SnapshotSummaryEs): SnapshotSummary {
  if (!snapshotSummaryEs || typeof snapshotSummaryEs !== 'object') {
    throw new Error('Unable to deserialize snapshot summary');
  }

  const {
    status,
    start_epoch: startEpoch,
    start_time: startTime,
    end_epoch: endEpoch,
    end_time: endTime,
    duration,
    indices,
    successful_shards: successfulShards,
    failed_shards: failedShards,
    total_shards: totalShards,
  } = snapshotSummaryEs;

  return {
    status,
    startEpoch,
    startTime,
    endEpoch,
    endTime,
    duration,
    indices,
    successfulShards,
    failedShards,
    totalShards,
  };
}

export function deserializeSnapshotDetails(snapshotDetailsEs: SnapshotDetailsEs): SnapshotDetails {
  if (!snapshotDetailsEs || typeof snapshotDetailsEs !== 'object') {
    throw new Error('Unable to deserialize snapshot details');
  }

  const {
    snapshot,
    uuid,
    version_id: versionId,
    version,
    indices,
    include_global_state: includeGlobalState,
    state,
    start_time: startTime,
    start_time_in_millis: startTimeInMillis,
    end_time: endTime,
    end_time_in_millis: endTimeInMillis,
    duration_in_millis: durationInMillis,
    failures,
    shards,
  } = snapshotDetailsEs;

  return {
    snapshot,
    uuid,
    versionId,
    version,
    indices,
    includeGlobalState,
    state,
    startTime,
    startTimeInMillis,
    endTime,
    endTimeInMillis,
    durationInMillis,
    failures,
    shards,
  };
}
