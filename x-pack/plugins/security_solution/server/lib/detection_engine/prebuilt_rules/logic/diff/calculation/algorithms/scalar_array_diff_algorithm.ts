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
  MissingVersion,
  ThreeWayDiffConflict,
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

  const hasBaseVersion = baseVersion !== MissingVersion;
  const { conflict, mergedVersion } = mergeVersions({
    hasBaseVersion,
    baseVersion: hasBaseVersion ? baseVersion : undefined,
    currentVersion,
    targetVersion,
    diffOutcome,
  });

  return {
    has_base_version: hasBaseVersion,
    base_version: hasBaseVersion ? baseVersion : undefined,
    current_version: currentVersion,
    target_version: targetVersion,
    merged_version: mergedVersion,

    diff_outcome: diffOutcome,
    conflict,
    has_update: valueCanUpdate,
  };
};

interface MergeResult<TValue> {
  mergedVersion: TValue[];
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs<TValue> {
  hasBaseVersion: boolean;
  baseVersion: TValue[] | undefined;
  currentVersion: TValue[];
  targetVersion: TValue[];
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = <TValue>({
  hasBaseVersion,
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs<TValue>): MergeResult<TValue> => {
  const dedupedBaseVersion = uniq(baseVersion);
  const dedupedCurrentVersion = uniq(currentVersion);
  const dedupedTargetVersion = uniq(targetVersion);

  switch (diffOutcome) {
    case ThreeWayDiffOutcome.StockValueNoUpdate: // Scenarios AAA and -AA
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate: // Scenario ABA
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate: // Scenario ABB
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: dedupedCurrentVersion,
      };

    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      if (!hasBaseVersion) {
        // Scenario -AB. Treated as scenario ABC, returns target
        // version and marked as "SOLVABLE" conflict.
        // https://github.com/elastic/kibana/pull/184889#discussion_r1636421293
        return {
          mergedVersion: targetVersion,
          conflict: ThreeWayDiffConflict.SOLVABLE,
        };
      }

      // Scenario AAB
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: dedupedTargetVersion,
      };
    }

    // Scenario ABC
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      const addedCurrent = difference(dedupedCurrentVersion, dedupedBaseVersion as TValue[]);
      const removedCurrent = difference(dedupedBaseVersion, dedupedCurrentVersion);

      const addedTarget = difference(dedupedTargetVersion, dedupedBaseVersion as TValue[]);
      const removedTarget = difference(dedupedBaseVersion, dedupedTargetVersion);

      const bothAdded = union(addedCurrent, addedTarget);
      const bothRemoved = union(removedCurrent, removedTarget);

      const merged = difference(union(dedupedBaseVersion, bothAdded), bothRemoved);

      return {
        conflict: ThreeWayDiffConflict.SOLVABLE,
        mergedVersion: merged,
      };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
