/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
  RuleDataSource,
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  determineDiffOutcome,
  determineIfValueCanUpdate,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  DataSourceType,
  determineOrderAgnosticDiffOutcome,
  ThreeWayDiffConflict,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { mergeDedupedArrays } from './helpers';

export const dataSourceDiffAlgorithm = (
  versions: ThreeVersionsOf<RuleDataSource>
): ThreeWayDiff<RuleDataSource> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  let diffOutcome: ThreeWayDiffOutcome;

  if (baseVersion === MissingVersion) {
    if (
      currentVersion.type === DataSourceType.index_patterns &&
      targetVersion.type === DataSourceType.index_patterns
    ) {
      diffOutcome = determineOrderAgnosticDiffOutcome(
        MissingVersion,
        currentVersion.index_patterns,
        targetVersion.index_patterns
      );
    } else {
      diffOutcome = determineDiffOutcome(baseVersion, currentVersion, targetVersion);
    }
  } else {
    if (
      baseVersion.type === DataSourceType.index_patterns &&
      currentVersion.type === DataSourceType.index_patterns &&
      targetVersion.type === DataSourceType.index_patterns
    ) {
      diffOutcome = determineOrderAgnosticDiffOutcome(
        baseVersion.index_patterns,
        currentVersion.index_patterns,
        targetVersion.index_patterns
      );
    } else {
      diffOutcome = determineDiffOutcome(baseVersion, currentVersion, targetVersion);
    }
  }

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
  mergedVersion: RuleDataSource;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs {
  baseVersion: RuleDataSource | undefined;
  currentVersion: RuleDataSource;
  targetVersion: RuleDataSource;
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = ({
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs): MergeResult => {
  const dedupedBaseVersion = baseVersion ? getDedupedDataSourceVersion(baseVersion) : baseVersion;
  const dedupedCurrentVersion = getDedupedDataSourceVersion(currentVersion);
  const dedupedTargetVersion = getDedupedDataSourceVersion(targetVersion);

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
        dedupedBaseVersion &&
        dedupedBaseVersion.type === DataSourceType.index_patterns &&
        dedupedCurrentVersion.type === DataSourceType.index_patterns &&
        dedupedTargetVersion.type === DataSourceType.index_patterns
      ) {
        return {
          conflict: ThreeWayDiffConflict.SOLVABLE,
          mergeOutcome: ThreeWayMergeOutcome.Merged,
          mergedVersion: {
            type: DataSourceType.index_patterns,
            index_patterns: mergeDedupedArrays(
              dedupedBaseVersion.index_patterns,
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

const getDedupedDataSourceVersion = (version: RuleDataSource): RuleDataSource => {
  if (version.type === DataSourceType.index_patterns) {
    return {
      ...version,
      index_patterns: uniq(version.index_patterns),
    };
  }
  return version;
};
