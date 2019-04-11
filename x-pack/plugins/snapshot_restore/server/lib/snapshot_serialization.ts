/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotDetails } from '../../common/types';
import { SnapshotDetailsEs } from '../types';

export function deserializeSnapshotDetails(
  repository: string,
  snapshotDetailsEs: SnapshotDetailsEs
): SnapshotDetails {
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
    repository,
    snapshot,
    uuid,
    versionId,
    version,
    indices,
    includeGlobalState: Boolean(includeGlobalState) ? 1 : 0,
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
