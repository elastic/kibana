/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
  RuleDataSource,
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  determineIfValueCanUpdate,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  DataSourceType,
  ThreeWayDiffConflict,
  determineDiffOutcomeForDataSource,
  isIndexPatternDataSourceType,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { getDedupedDataSourceVersion, mergeDedupedArrays } from './helpers';

/**
 * Takes a type of `RuleDataSource | undefined` because the data source can be index patterns, a data view id, or neither in some cases
 */
export const dataSourceDiffAlgorithm = (
  versions: ThreeVersionsOf<RuleDataSource | undefined>
): ThreeWayDiff<RuleDataSource | undefined> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineDiffOutcomeForDataSource(baseVersion, currentVersion, targetVersion);

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
  mergedVersion: RuleDataSource | undefined;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs {
  baseVersion: RuleDataSource | undefined;
  currentVersion: RuleDataSource | undefined;
  targetVersion: RuleDataSource | undefined;
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = ({
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs): MergeResult => {
  const dedupedBaseVersion = baseVersion ? getDedupedDataSourceVersion(baseVersion) : baseVersion;
  const dedupedCurrentVersion = currentVersion
    ? getDedupedDataSourceVersion(currentVersion)
    : currentVersion;
  const dedupedTargetVersion = targetVersion
    ? getDedupedDataSourceVersion(targetVersion)
    : targetVersion;

  switch (diffOutcome) {
    // Scenario -AA is treated as scenario AAA:
    // https://github.com/elastic/kibana/pull/184889#discussion_r1636421293
    case ThreeWayDiffOutcome.MissingBaseNoUpdate:
    case ThreeWayDiffOutcome.StockValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergeOutcome: ThreeWayMergeOutcome.Current,
        mergedVersion: dedupedCurrentVersion,
      };

    case ThreeWayDiffOutcome.StockValueCanUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergeOutcome: ThreeWayMergeOutcome.Target,
        mergedVersion: dedupedTargetVersion,
      };

    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      if (
        isIndexPatternDataSourceType(dedupedCurrentVersion) &&
        isIndexPatternDataSourceType(dedupedTargetVersion)
      ) {
        const baseVersionToMerge =
          dedupedBaseVersion && dedupedBaseVersion.type === DataSourceType.index_patterns
            ? dedupedBaseVersion.index_patterns
            : [];

        return {
          conflict: ThreeWayDiffConflict.SOLVABLE,
          mergeOutcome: ThreeWayMergeOutcome.Merged,
          mergedVersion: {
            type: DataSourceType.index_patterns,
            index_patterns: mergeDedupedArrays(
              baseVersionToMerge,
              dedupedCurrentVersion.index_patterns,
              dedupedTargetVersion.index_patterns
            ),
          },
        };
      }

      return {
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
        mergeOutcome: ThreeWayMergeOutcome.Current,
        mergedVersion: dedupedCurrentVersion,
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
