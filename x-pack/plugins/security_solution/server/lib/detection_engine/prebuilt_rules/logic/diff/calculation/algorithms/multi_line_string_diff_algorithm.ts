/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'node-diff3';
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
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';

/**
 * Diff algorithm used for string fields that contain multiple lines
 */
export const multiLineStringDiffAlgorithm = (
  versions: ThreeVersionsOf<string>
): ThreeWayDiff<string> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineDiffOutcome(baseVersion, currentVersion, targetVersion);
  const valueCanUpdate = determineIfValueCanUpdate(diffOutcome);

  const hasBaseVersion = baseVersion !== MissingVersion;

  const { mergeOutcome, conflict, mergedVersion } = mergeVersions({
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
    merge_outcome: mergeOutcome,

    diff_outcome: diffOutcome,
    conflict,
    has_update: valueCanUpdate,
  };
};

interface MergeResult {
  mergeOutcome: ThreeWayMergeOutcome;
  mergedVersion: string;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs {
  baseVersion: string | undefined;
  currentVersion: string;
  targetVersion: string;
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = ({
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs): MergeResult => {
  switch (diffOutcome) {
    // Scenario -AA is treated as scenario AAA:
    // https://github.com/elastic/kibana/pull/184889#discussion_r1636421293
    case ThreeWayDiffOutcome.MissingBaseNoUpdate:
    case ThreeWayDiffOutcome.StockValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: currentVersion,
        mergeOutcome: ThreeWayMergeOutcome.Current,
      };

    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };
    }

    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      // TS does not realize that in ABC scenario, baseVersion cannot be missing
      // Missing baseVersion scenarios were handled as -AA and -AB.
      const mergedVersion = merge(currentVersion, baseVersion ?? '', targetVersion, {
        stringSeparator: /(\r\n|\n|\r)/g, // Separates strings by new lines
      });

      return mergedVersion.conflict
        ? {
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
            mergedVersion: currentVersion,
            mergeOutcome: ThreeWayMergeOutcome.Current,
          }
        : {
            conflict: ThreeWayDiffConflict.SOLVABLE,
            mergedVersion: mergedVersion.result.join(''),
            mergeOutcome: ThreeWayMergeOutcome.Merged,
          };
    }

    // Scenario -AB is treated as scenario ABC, but marked as
    // SOLVABLE, and returns the target version as the merged version
    // https://github.com/elastic/kibana/pull/184889#discussion_r1636421293
    case ThreeWayDiffOutcome.MissingBaseCanUpdate: {
      return {
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
