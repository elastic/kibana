/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';

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
    indices = [],
    include_global_state: includeGlobalState,
    state,
    start_time: startTime,
    start_time_in_millis: startTimeInMillis,
    end_time: endTime,
    end_time_in_millis: endTimeInMillis,
    duration_in_millis: durationInMillis,
    failures = [],
    shards,
  } = snapshotDetailsEs;

  // If an index has multiple failures, we'll want to see them grouped together.
  const indexToFailuresMap = failures.reduce((map, failure) => {
    const { index, ...rest } = failure;
    if (!map[index]) {
      map[index] = {
        index,
        failures: [],
      };
    }

    map[index].failures.push(rest);
    return map;
  }, {});

  // Sort all failures by their shard.
  Object.keys(indexToFailuresMap).forEach(index => {
    indexToFailuresMap[index].failures = sortBy(
      indexToFailuresMap[index].failures,
      ({ shard }) => shard
    );
  });

  // Sort by index name.
  const indexFailures = sortBy(Object.values(indexToFailuresMap), ({ index }) => index);

  return {
    repository,
    snapshot,
    uuid,
    versionId,
    version,
    indices: [...indices].sort(),
    includeGlobalState: Boolean(includeGlobalState) ? 1 : 0,
    state,
    startTime,
    startTimeInMillis,
    endTime,
    endTimeInMillis,
    durationInMillis,
    indexFailures,
    shards,
  };
}
