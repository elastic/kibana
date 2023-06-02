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

  if (baseVersion === MissingVersion) {
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
