/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { MissingVersion } from './three_way_diff';
import type { RuleDataSource } from '../diffable_rule/diffable_field_types';
import { DataSourceType } from '../diffable_rule/diffable_field_types';

/**
 * Result of comparing three versions of a value against each other.
 * Defines 5 typical combinations of 3 versions of a value.
 */
export enum ThreeWayDiffOutcome {
  /** Stock rule, the value hasn't changed in the target version. */
  StockValueNoUpdate = 'BASE=A, CURRENT=A, TARGET=A',

  /** Stock rule, the value has changed in the target version. */
  StockValueCanUpdate = 'BASE=A, CURRENT=A, TARGET=B',

  /** Customized rule, the value hasn't changed in the target version comparing to the base one. */
  CustomizedValueNoUpdate = 'BASE=A, CURRENT=B, TARGET=A',

  /** Customized rule, the value has changed in the target version exactly the same way as in the user customization. */
  CustomizedValueSameUpdate = 'BASE=A, CURRENT=B, TARGET=B',

  /** Customized rule, the value has changed in the target version and is not equal to the current version. */
  CustomizedValueCanUpdate = 'BASE=A, CURRENT=B, TARGET=C',

  /** Missing  base, the value hasn't changed in the target version. */
  MissingBaseNoUpdate = 'BASE=-, CURRENT=A, TARGET=A',

  /** Missing  base, the value changed in the target version. */
  MissingBaseCanUpdate = 'BASE=-, CURRENT=A, TARGET=B',
}

export const determineDiffOutcome = <TValue>(
  baseVersion: TValue | MissingVersion,
  currentVersion: TValue,
  targetVersion: TValue
): ThreeWayDiffOutcome => {
  const baseEqlCurrent = isEqual(baseVersion, currentVersion);
  const baseEqlTarget = isEqual(baseVersion, targetVersion);
  const currentEqlTarget = isEqual(currentVersion, targetVersion);

  return getThreeWayDiffOutcome({
    baseEqlCurrent,
    baseEqlTarget,
    currentEqlTarget,
    hasBaseVersion: baseVersion !== MissingVersion,
  });
};

/**
 * Determines diff outcomes of array fields that do not care about order (e.g. `[1, 2 , 3] === [3, 2, 1]`)
 */
export const determineOrderAgnosticDiffOutcome = <TValue>(
  baseVersion: TValue[] | MissingVersion,
  currentVersion: TValue[],
  targetVersion: TValue[]
): ThreeWayDiffOutcome => {
  const baseSet = baseVersion === MissingVersion ? MissingVersion : new Set<TValue>(baseVersion);
  const currentSet = new Set<TValue>(currentVersion);
  const targetSet = new Set<TValue>(targetVersion);
  const baseEqlCurrent = isEqual(baseSet, currentSet);
  const baseEqlTarget = isEqual(baseSet, targetSet);
  const currentEqlTarget = isEqual(currentSet, targetSet);

  return getThreeWayDiffOutcome({
    baseEqlCurrent,
    baseEqlTarget,
    currentEqlTarget,
    hasBaseVersion: baseVersion !== MissingVersion,
  });
};

/**
 * Determines diff outcome for `data_source` field
 *
 * NOTE: uses order agnostic comparison for nested array fields (e.g. `index`)
 */
export const determineDiffOutcomeForDataSource = (
  baseVersion: RuleDataSource | MissingVersion,
  currentVersion: RuleDataSource,
  targetVersion: RuleDataSource
): ThreeWayDiffOutcome => {
  const isBaseVersionMissing = baseVersion === MissingVersion;

  if (
    (isBaseVersionMissing || isIndexPatternDataSourceType(baseVersion)) &&
    isIndexPatternDataSourceType(currentVersion) &&
    isIndexPatternDataSourceType(targetVersion)
  ) {
    return determineOrderAgnosticDiffOutcome(
      isBaseVersionMissing ? MissingVersion : baseVersion.index_patterns,
      currentVersion.index_patterns,
      targetVersion.index_patterns
    );
  }

  return determineDiffOutcome(baseVersion, currentVersion, targetVersion);
};

interface DetermineDiffOutcomeProps {
  baseEqlCurrent: boolean;
  baseEqlTarget: boolean;
  currentEqlTarget: boolean;
  hasBaseVersion: boolean;
}

const getThreeWayDiffOutcome = ({
  baseEqlCurrent,
  baseEqlTarget,
  currentEqlTarget,
  hasBaseVersion,
}: DetermineDiffOutcomeProps): ThreeWayDiffOutcome => {
  if (!hasBaseVersion) {
    /**
     * We couldn't find the base version of the rule in the package so further
     * version comparison is not possible. We assume that the rule is
     * customized and the value can be updated if there's an update.
     */
    return currentEqlTarget
      ? ThreeWayDiffOutcome.MissingBaseNoUpdate
      : ThreeWayDiffOutcome.MissingBaseCanUpdate;
  }

  if (baseEqlCurrent) {
    return currentEqlTarget
      ? ThreeWayDiffOutcome.StockValueNoUpdate
      : ThreeWayDiffOutcome.StockValueCanUpdate;
  }

  if (baseEqlTarget) {
    return ThreeWayDiffOutcome.CustomizedValueNoUpdate;
  }

  return currentEqlTarget
    ? ThreeWayDiffOutcome.CustomizedValueSameUpdate
    : ThreeWayDiffOutcome.CustomizedValueCanUpdate;
};

export const determineIfValueCanUpdate = (diffCase: ThreeWayDiffOutcome): boolean => {
  return (
    diffCase === ThreeWayDiffOutcome.StockValueCanUpdate ||
    diffCase === ThreeWayDiffOutcome.CustomizedValueCanUpdate ||
    diffCase === ThreeWayDiffOutcome.MissingBaseCanUpdate
  );
};

const isIndexPatternDataSourceType = (
  version: RuleDataSource
): version is Extract<RuleDataSource, { type: DataSourceType.index_patterns }> =>
  version.type === DataSourceType.index_patterns;
