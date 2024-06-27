/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { MissingVersion } from './three_way_diff';

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
  let baseEqlCurrent: boolean;
  let baseEqlTarget: boolean;
  if (baseVersion !== MissingVersion) {
    baseEqlCurrent = arraysHaveSameElements(baseVersion, currentVersion);
    baseEqlTarget = arraysHaveSameElements(baseVersion, targetVersion);
  } else {
    baseEqlCurrent = false;
    baseEqlTarget = false;
  }
  const currentEqlTarget = arraysHaveSameElements(currentVersion, targetVersion);

  return getThreeWayDiffOutcome({
    baseEqlCurrent,
    baseEqlTarget,
    currentEqlTarget,
    hasBaseVersion: baseVersion !== MissingVersion,
  });
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
     * version comparison is not possible. We assume that the rule is not
     * customized and the value can be updated if there's an update.
     */
    return currentEqlTarget
      ? ThreeWayDiffOutcome.StockValueNoUpdate
      : ThreeWayDiffOutcome.StockValueCanUpdate;
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
    diffCase === ThreeWayDiffOutcome.CustomizedValueCanUpdate
  );
};

/**
 * Returns a boolean if 2 arrays contain same the elements agnostic of order after being deduplicated
 *
 * NOTE: array equality is case insensitive
 */
const arraysHaveSameElements = <T>(arr1: T[], arr2: T[]) => {
  const set1 = new Set(
    arr1.map((value) => (typeof value === 'string' ? value.toLowerCase() : value))
  );
  const set2 = new Set(
    arr2.map((value) => (typeof value === 'string' ? value.toLowerCase() : value))
  );

  if (set1.size !== set2.size) {
    return false;
  }

  for (const val of set1) {
    if (!set2.has(val)) {
      return false;
    }
  }

  return true;
};
