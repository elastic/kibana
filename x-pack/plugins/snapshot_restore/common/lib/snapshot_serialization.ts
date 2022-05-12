/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { flow, map, flatten, uniq } from 'lodash/fp';

import {
  SnapshotDetails,
  SnapshotDetailsEs,
  SnapshotConfig,
  SnapshotConfigEs,
  SnapshotRetention,
  SnapshotRetentionEs,
} from '../types';

import { deserializeTime, serializeTime } from './time_serialization';

import { csvToArray } from './utils';

export const convertFeaturesToIndicesArray = (
  features: SnapshotDetailsEs['feature_states']
): string[] => {
  return flow(
    // Map each feature into Indices[]
    map('indices'),
    // Flatten the array
    flatten,
    // And finally dedupe the indices
    uniq
  )(features);
};

export function deserializeSnapshotDetails(
  snapshotDetailsEs: SnapshotDetailsEs,
  managedRepository?: string,
  successfulSnapshots?: SnapshotDetailsEs[]
): SnapshotDetails {
  if (!snapshotDetailsEs || typeof snapshotDetailsEs !== 'object') {
    throw new Error('Unable to deserialize snapshot details');
  }

  const {
    snapshot,
    uuid,
    repository,
    version_id: versionId,
    version,
    indices = [],
    data_streams: dataStreams = [],
    include_global_state: includeGlobalState,
    state,
    start_time: startTime,
    start_time_in_millis: startTimeInMillis,
    end_time: endTime,
    end_time_in_millis: endTimeInMillis,
    duration_in_millis: durationInMillis,
    failures = [],
    shards,
    feature_states: featureStates = [],
    metadata: { policy: policyName } = { policy: undefined },
  } = snapshotDetailsEs;

  const systemIndices = convertFeaturesToIndicesArray(featureStates);
  const snapshotIndicesWithoutSystemIndices = indices
    .filter((index) => !systemIndices.includes(index))
    .sort();

  // If an index has multiple failures, we'll want to see them grouped together.
  const indexToFailuresMap = failures.reduce((aggregation, failure) => {
    const { index, ...rest } = failure;
    if (!aggregation[index]) {
      aggregation[index] = {
        index,
        failures: [],
      };
    }

    aggregation[index].failures.push(rest);
    return aggregation;
  }, {});

  // Sort all failures by their shard.
  Object.keys(indexToFailuresMap).forEach((index) => {
    indexToFailuresMap[index].failures = sortBy(
      indexToFailuresMap[index].failures,
      ({ shard }) => shard
    );
  });

  // Sort by index name.
  const indexFailures = sortBy(Object.values(indexToFailuresMap), ({ index }) => index);

  const snapshotDetails: SnapshotDetails = {
    repository,
    snapshot,
    uuid,
    versionId,
    version,
    indices: snapshotIndicesWithoutSystemIndices,
    dataStreams: [...dataStreams].sort(),
    includeGlobalState,
    state,
    startTime,
    startTimeInMillis,
    endTime,
    endTimeInMillis,
    durationInMillis,
    indexFailures,
    shards,
    managedRepository,
  };

  if (successfulSnapshots && successfulSnapshots.length) {
    snapshotDetails.isLastSuccessfulSnapshot = successfulSnapshots[0].snapshot === snapshot;
  }

  if (policyName) {
    snapshotDetails.policyName = policyName;
  }
  return snapshotDetails;
}

export function deserializeSnapshotConfig(snapshotConfigEs: SnapshotConfigEs): SnapshotConfig {
  const {
    indices,
    ignore_unavailable: ignoreUnavailable,
    include_global_state: includeGlobalState,
    partial,
    metadata,
  } = snapshotConfigEs;

  const snapshotConfig: SnapshotConfig = {
    indices,
    ignoreUnavailable,
    includeGlobalState,
    partial,
    metadata,
  };

  return Object.entries(snapshotConfig).reduce((config: any, [key, value]) => {
    if (value !== undefined) {
      config[key] = value;
    }
    return config;
  }, {});
}

export function serializeSnapshotConfig(snapshotConfig: SnapshotConfig): SnapshotConfigEs {
  const { indices, ignoreUnavailable, includeGlobalState, partial, metadata } = snapshotConfig;

  const maybeIndicesArray = csvToArray(indices);

  const snapshotConfigEs: SnapshotConfigEs = {
    indices: maybeIndicesArray,
    ignore_unavailable: ignoreUnavailable,
    include_global_state: includeGlobalState,
    partial,
    metadata,
  };

  return Object.entries(snapshotConfigEs).reduce((config: any, [key, value]) => {
    if (value !== undefined) {
      config[key] = value;
    }
    return config;
  }, {});
}

export function deserializeSnapshotRetention(
  snapshotRetentionEs: SnapshotRetentionEs
): SnapshotRetention {
  const {
    expire_after: expireAfter,
    max_count: maxCount,
    min_count: minCount,
  } = snapshotRetentionEs;

  let expireAfterValue;
  let expireAfterUnit;

  if (expireAfter) {
    const { timeValue, timeUnit } = deserializeTime(expireAfter);

    if (timeValue && timeUnit) {
      expireAfterValue = timeValue;
      expireAfterUnit = timeUnit;
    }
  }

  const snapshotRetention: SnapshotRetention = {
    expireAfterValue,
    expireAfterUnit,
    maxCount,
    minCount,
  };

  return Object.entries(snapshotRetention).reduce((retention: any, [key, value]) => {
    if (value !== undefined) {
      retention[key] = value;
    }
    return retention;
  }, {});
}

export function serializeSnapshotRetention(
  snapshotRetention: SnapshotRetention
): SnapshotRetentionEs | undefined {
  const { expireAfterValue, expireAfterUnit, minCount, maxCount } = snapshotRetention;

  const snapshotRetentionEs: SnapshotRetentionEs = {
    expire_after:
      expireAfterValue && expireAfterUnit
        ? serializeTime(expireAfterValue, expireAfterUnit)
        : undefined,
    min_count: !minCount ? undefined : minCount,
    max_count: !maxCount ? undefined : maxCount,
  };

  const flattenedSnapshotRetentionEs = Object.entries(snapshotRetentionEs).reduce(
    (retention: any, [key, value]) => {
      if (value !== undefined) {
        retention[key] = value;
      }
      return retention;
    },
    {}
  );

  return Object.entries(flattenedSnapshotRetentionEs).length
    ? flattenedSnapshotRetentionEs
    : undefined;
}
