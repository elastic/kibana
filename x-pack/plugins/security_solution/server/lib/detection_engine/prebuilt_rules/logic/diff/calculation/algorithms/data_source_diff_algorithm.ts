/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { union, uniq } from 'lodash';
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
  mergedVersion: RuleDataSource;
}

interface MergeArgs {
  baseVersion: RuleDataSource | MissingVersion;
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
  const dedupedBaseVersion =
    baseVersion !== MissingVersion ? getDedupedDataSourceVersion(baseVersion) : MissingVersion;
  const dedupedCurrentVersion = getDedupedDataSourceVersion(currentVersion);
  const dedupedTargetVersion = getDedupedDataSourceVersion(targetVersion);

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
        if (
          dedupedCurrentVersion.type === DataSourceType.index_patterns &&
          dedupedTargetVersion.type === DataSourceType.index_patterns
        ) {
          return {
            mergeOutcome: ThreeWayMergeOutcome.Merged,
            mergedVersion: {
              type: DataSourceType.index_patterns,
              index_patterns: union(
                dedupedCurrentVersion.index_patterns,
                dedupedTargetVersion.index_patterns
              ),
            },
          };
        }
        return {
          mergeOutcome: ThreeWayMergeOutcome.Conflict,
          mergedVersion: dedupedCurrentVersion,
        };
      }

      if (
        dedupedBaseVersion.type === DataSourceType.index_patterns &&
        dedupedCurrentVersion.type === DataSourceType.index_patterns &&
        dedupedTargetVersion.type === DataSourceType.index_patterns
      ) {
        return {
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
        mergeOutcome: ThreeWayMergeOutcome.Conflict,
        mergedVersion: dedupedCurrentVersion,
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
