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
  MissingVersion,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
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
  console.log({diffOutcome})
  const hasBaseVersion = baseVersion !== MissingVersion;

  const { conflict, mergedVersion } = mergeVersions({
    hasBaseVersion,
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
    has_update: valueCanUpdate,
    conflict,
  };
};

interface MergeResult<TValue> {
  mergedVersion: TValue;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs<TValue> {
  hasBaseVersion: boolean;
  currentVersion: TValue;
  targetVersion: TValue;
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = <TValue>({
  hasBaseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs<TValue>): MergeResult<TValue> => {
  switch (diffOutcome) {
    case ThreeWayDiffOutcome.StockValueNoUpdate: // Scenarios AAA and -AA
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate: // Scenario ABA
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate: // Scenario ABB
      return {
        mergedVersion: currentVersion,
        conflict: ThreeWayDiffConflict.NONE,
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
        mergedVersion: targetVersion,
        conflict: ThreeWayDiffConflict.NONE,
      };
    }

    // Scenario ABC
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      return {
        mergedVersion: currentVersion,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
