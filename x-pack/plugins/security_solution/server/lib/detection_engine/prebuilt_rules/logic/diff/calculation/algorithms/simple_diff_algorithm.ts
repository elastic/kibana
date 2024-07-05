/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';

/**
 * The default diff algorithm, diffs versions passed using a simple lodash `isEqual` comparison
 *
 * Meant to be used with primitive types (strings, numbers, booleans), NOT Arrays or Objects
 */
export const simpleDiffAlgorithm = <TValue>(
  versions: ThreeVersionsOf<TValue>
): ThreeWayDiff<TValue> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineDiffOutcome(baseVersion, currentVersion, targetVersion);
  const valueCanUpdate = determineIfValueCanUpdate(diffOutcome);

  const { mergeOutcome, mergedVersion } = mergeVersions({
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
  currentVersion: TValue;
  targetVersion: TValue;
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = <TValue>({
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs<TValue>): MergeResult<TValue> => {
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
      return {
        mergeOutcome: ThreeWayMergeOutcome.Conflict,
        mergedVersion: currentVersion,
      };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
