/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, union, uniq } from 'lodash';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  determineOrderAgnosticDiffOutcome,
  determineIfValueCanUpdate,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';

/**
 * Diff algorithm used for arrays of scalar values (eg. numbers, strings, booleans, etc.)
 *
 * NOTE: Diffing logic will be agnostic to array order
 */
export const scalarArrayDiffAlgorithm = <TValue>(
  versions: ThreeVersionsOf<TValue[]>
): ThreeWayDiff<TValue[]> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineOrderAgnosticDiffOutcome(baseVersion, currentVersion, targetVersion);
  const valueCanUpdate = determineIfValueCanUpdate(diffOutcome);

  const { mergeOutcome, mergedVersion } = mergeVersions({
    baseVersion,
    currentVersion,
    targetVersion,
    diffOutcome,
  });

  return {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
    merged_version: mergedVersion,

    diff_outcome: diffOutcome,
    merge_outcome: mergeOutcome,
    has_update: valueCanUpdate,
    has_conflict: mergeOutcome === ThreeWayMergeOutcome.Conflict,
  };
};

interface MergeResult<TValue> {
  mergeOutcome: ThreeWayMergeOutcome;
  mergedVersion: TValue[];
}

interface MergeArgs<TValue> {
  baseVersion: TValue[] | MissingVersion;
  currentVersion: TValue[];
  targetVersion: TValue[];
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = <TValue>({
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs<TValue>): MergeResult<TValue> => {
  const dedupedBaseVersion = baseVersion !== MissingVersion ? uniq(baseVersion) : MissingVersion;
  const dedupedCurrentVersion = uniq(currentVersion);
  const dedupedTargetVersion = uniq(targetVersion);

  switch (diffOutcome) {
    case ThreeWayDiffOutcome.StockValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate: {
      return {
        mergeOutcome: ThreeWayMergeOutcome.Current,
        mergedVersion: dedupedCurrentVersion,
      };
    }
    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      return {
        mergeOutcome: ThreeWayMergeOutcome.Target,
        mergedVersion: dedupedTargetVersion,
      };
    }
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      if (dedupedBaseVersion === MissingVersion) {
        return {
          mergeOutcome: ThreeWayMergeOutcome.Merged,
          mergedVersion: union(currentVersion, targetVersion),
        };
      }

      const addedCurrent = difference(dedupedCurrentVersion, dedupedBaseVersion);
      const removedCurrent = difference(dedupedBaseVersion, dedupedCurrentVersion);

      const addedTarget = difference(dedupedTargetVersion, dedupedBaseVersion);
      const removedTarget = difference(dedupedBaseVersion, dedupedTargetVersion);

      const bothAdded = union(addedCurrent, addedTarget);
      const bothRemoved = union(removedCurrent, removedTarget);

      const merged = difference(union(dedupedBaseVersion, bothAdded), bothRemoved);

      return {
        mergeOutcome: ThreeWayMergeOutcome.Merged,
        mergedVersion: merged,
      };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
