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
  ThreeWayMergeOutcome,
  MissingVersion,
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

interface MergeResult {
  mergeOutcome: ThreeWayMergeOutcome;
  mergedVersion: string;
}

interface MergeArgs {
  baseVersion: string | MissingVersion;
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
          mergeOutcome: ThreeWayMergeOutcome.Conflict,
          mergedVersion: currentVersion,
        };
      }
      const mergedVersion = merge(currentVersion, baseVersion, targetVersion, {
        stringSeparator: /[^\S\r\n]+/, // Separates on all whitespace except for new lines, which we keep to preserve formatting
      });

      return mergedVersion.conflict
        ? {
            mergeOutcome: ThreeWayMergeOutcome.Conflict,
            mergedVersion: currentVersion,
          }
        : {
            mergeOutcome: ThreeWayMergeOutcome.Merged,
            mergedVersion: mergedVersion.result.join(' '),
          };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
