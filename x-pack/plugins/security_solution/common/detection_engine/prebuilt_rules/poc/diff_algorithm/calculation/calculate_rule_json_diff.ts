/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { mergeDiff3 } from 'node-diff3';

import type { RuleFieldsDiff, RuleJsonDiff } from '../../diff_model/rule_diff';
import type { ThreeWayDiff } from '../../diff_model/three_way_diff';
import {
  determineDiffOutcome,
  determineIfValueChanged,
} from '../../diff_model/three_way_diff_outcome';
import { ThreeWayMergeOutcome } from '../../diff_model/three_way_merge_outcome';

export const calculateRuleJsonDiff = (fieldsDiff: RuleFieldsDiff): RuleJsonDiff => {
  const baseFields = getFromDiff(fieldsDiff, (diff) => diff.base_version);
  const currentFields = getFromDiff(fieldsDiff, (diff) => diff.current_version);
  const targetFields = getFromDiff(fieldsDiff, (diff) => diff.target_version);

  const baseJson = serializeToJson(baseFields);
  const currentJson = serializeToJson(currentFields);
  const targetJson = serializeToJson(targetFields);

  const diffOutcome = determineDiffOutcome(baseJson, currentJson, targetJson);
  const hasValueChanged = determineIfValueChanged(diffOutcome);

  // How do we calculate the merged version?
  // Option 1: calculate a diff between the 3 JSONs; return the result in a standard format, e.g. git unidiff.

  // https://github.com/bhousel/node-diff3#mergeDiff3
  const mergeResult = mergeDiff3(currentJson, baseJson, targetJson, {
    excludeFalseConflicts: true,
    label: {
      o: 'base version',
      a: 'current version',
      b: 'target version',
    },
  });

  const mergedJson = mergeResult.result.join('\n');
  const hasConflict = mergeResult.conflict;

  // How do we calculate the merged version?
  // Option 2: simply combine the merged fields into an object and convert it to JSON.

  // const mergedFields = getFromDiff(fieldsDiff, (diff) => diff.merged_version);
  // const mergedJson = serializeToJson(mergedFields);
  // const conflicts = getFromDiff(fieldsDiff, (diff) => diff.has_conflict);
  // const hasConflict = conflicts.some((item) => item.value);

  return {
    base_version: baseJson,
    current_version: currentJson,
    target_version: targetJson,
    merged_version: mergedJson,

    diff_outcome: diffOutcome,
    merge_outcome: hasConflict
      ? ThreeWayMergeOutcome.MergedWithConflict
      : ThreeWayMergeOutcome.Merged,

    has_value_changed: hasValueChanged,
    has_conflict: hasConflict,
  };
};

const getFromDiff = <TValue>(
  fieldsDiff: RuleFieldsDiff,
  getter: (diff: ThreeWayDiff<unknown>) => TValue
): Array<{ fieldName: string; value: TValue }> => {
  return Object.entries(fieldsDiff).map(([fieldName, fieldDiff]) => {
    const value = getter(fieldDiff as ThreeWayDiff<unknown>);
    return { fieldName, value };
  });
};

const serializeToJson = (fields: Array<{ fieldName: string; value: unknown }>): string => {
  const sortedFields = sortBy(fields, (f) => f.fieldName);
  const objectWithFields = sortedFields.reduce<Record<string, unknown>>((obj, item) => {
    obj[item.fieldName] = item.value;
    return obj;
  }, {});

  return JSON.stringify(objectWithFields, null, 2);
};
