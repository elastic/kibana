/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, union } from 'lodash';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  determineDiffOutcome,
  determineIfValueCanUpdate,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';

export type ScalarArrayDiffAlgorithmType = string[]; // We currently don't have any fields that use any other types than strings

export const scalarArrayDiffAlgorithm = (
  versions: ThreeVersionsOf<ScalarArrayDiffAlgorithmType>
): ThreeWayDiff<ScalarArrayDiffAlgorithmType> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineDiffOutcome(baseVersion, currentVersion, targetVersion);
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
  mergedVersion: TValue;
}

interface MergeArgs<TValue> {
  baseVersion: TValue | MissingVersion;
  currentVersion: TValue;
  targetVersion: TValue;
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = ({
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs<ScalarArrayDiffAlgorithmType>): MergeResult<ScalarArrayDiffAlgorithmType> => {
  switch (diffOutcome) {
    case ThreeWayDiffOutcome.StockValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate: {
      return {
        mergeOutcome: ThreeWayMergeOutcome.Current,
        mergedVersion: currentVersion,
      };
    }
    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      return {
        mergeOutcome: ThreeWayMergeOutcome.Target,
        mergedVersion: targetVersion,
      };
    }
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      if (baseVersion === MissingVersion) {
        return {
          mergeOutcome: ThreeWayMergeOutcome.Merged,
          mergedVersion: union(currentVersion, targetVersion),
        };
      }

      const addedCurrent = difference(currentVersion, baseVersion);
      const removedCurrent = difference(baseVersion, currentVersion);

      const addedTarget = difference(targetVersion, baseVersion);
      const removedTarget = difference(baseVersion, targetVersion);

      const bothAdded = union(addedCurrent, addedTarget);
      const bothRemoved = union(removedCurrent, removedTarget);

      const merged = difference(union(baseVersion, bothAdded), bothRemoved);

      return {
        mergeOutcome: ThreeWayMergeOutcome.Merged,
        mergedVersion: merged,
      };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
