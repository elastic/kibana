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
  ThreeWayDiffOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
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

  const { conflict, mergedVersion } = mergeVersions({
    hasBaseVersion,
    baseVersion,
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

interface MergeResult {
  mergedVersion: string;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs {
  hasBaseVersion: boolean;
  baseVersion: string | MissingVersion;
  currentVersion: string;
  targetVersion: string;
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = ({
  hasBaseVersion,
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs): MergeResult => {
  switch (diffOutcome) {
    case ThreeWayDiffOutcome.StockValueNoUpdate: // Scenarios AAA and -AA
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate: // Scenario ABA
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate: // Scenario ABB
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: currentVersion,
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
        mergedVersion: targetVersion,
      };
    }

    // Scenario ABC
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      // TS does not realize that in ABC scenario, baseVersion cannot be missing
      // Missing baseVersion scenarios were handled as -AA and -AB.
      const mergedVersion = merge(currentVersion, baseVersion as string, targetVersion, {
        stringSeparator: /(\S+|\s+)/g, // Retains all whitespace, which we keep to preserve formatting
      });

      return mergedVersion.conflict
        ? {
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
            mergedVersion: currentVersion,
          }
        : {
            conflict: ThreeWayDiffConflict.SOLVABLE,
            mergedVersion: mergedVersion.result.join(''),
          };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
