/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'node-diff3';
import { isEqual } from 'lodash';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
  RuleKqlQuery,
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  determineIfValueCanUpdate,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
  determineDiffOutcome,
  KqlQueryType,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';

export const kqlQueryDiffAlgorithm = (
  versions: ThreeVersionsOf<RuleKqlQuery>
): ThreeWayDiff<RuleKqlQuery> => {
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
  mergedVersion: RuleKqlQuery;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs {
  baseVersion: RuleKqlQuery | undefined;
  currentVersion: RuleKqlQuery;
  targetVersion: RuleKqlQuery;
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
        mergeOutcome: ThreeWayMergeOutcome.Current,
        mergedVersion: currentVersion,
      };

    case ThreeWayDiffOutcome.StockValueCanUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergeOutcome: ThreeWayMergeOutcome.Target,
        mergedVersion: targetVersion,
      };

    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      if (
        baseVersion &&
        baseVersion.type === KqlQueryType.inline_query &&
        currentVersion.type === KqlQueryType.inline_query &&
        targetVersion.type === KqlQueryType.inline_query
      ) {
        // TS does not realize that in ABC scenario, baseVersion cannot be missing
        // Missing baseVersion scenarios were handled as -AA and -AB.
        const mergedVersion = merge(currentVersion.query, baseVersion.query, targetVersion.query, {
          stringSeparator: /(\S+|\s+)/g, // Retains all whitespace, which we keep to preserve formatting
        });

        const baseNonMergeableFields = {
          filters: baseVersion.filters,
          language: baseVersion.language,
        };

        const currentNonMergeableFields = {
          filters: currentVersion.filters,
          language: currentVersion.language,
        };

        const targetNonMergeableFields = {
          filters: targetVersion.filters,
          language: targetVersion.language,
        };

        const baseEqlCurrent = isEqual(baseNonMergeableFields, currentNonMergeableFields);
        const baseEqlTarget = isEqual(baseNonMergeableFields, targetNonMergeableFields);
        const currentEqlTarget = isEqual(currentNonMergeableFields, targetNonMergeableFields);

        if (
          baseEqlCurrent &&
          baseEqlTarget &&
          currentEqlTarget &&
          mergedVersion.conflict === false
        ) {
          return {
            conflict: ThreeWayDiffConflict.SOLVABLE,
            mergedVersion: { ...currentVersion, query: mergedVersion.result.join('') },
            mergeOutcome: ThreeWayMergeOutcome.Merged,
          };
        }
      }

      return {
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
        mergeOutcome: ThreeWayMergeOutcome.Current,
        mergedVersion: currentVersion,
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
