/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DiffableCommonFields,
  DiffableCustomQueryFields,
  DiffableEqlFields,
  DiffableMachineLearningFields,
  DiffableNewTermsFields,
  DiffableSavedQueryFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
} from '../diffable_rule_model/diffable_rule';

import type { FieldsDiff } from './fields_diff';
import type { ThreeWayDiff } from './three_way_diff';

export type CommonFieldsDiff = FieldsDiff<DiffableCommonFields>;
export type CustomQueryFieldsDiff = FieldsDiff<DiffableCustomQueryFields>;
export type SavedQueryFieldsDiff = FieldsDiff<DiffableSavedQueryFields>;
export type EqlFieldsDiff = FieldsDiff<DiffableEqlFields>;
export type ThreatMatchFieldsDiff = FieldsDiff<DiffableThreatMatchFields>;
export type ThresholdFieldsDiff = FieldsDiff<DiffableThresholdFields>;
export type MachineLearningFieldsDiff = FieldsDiff<DiffableMachineLearningFields>;
export type NewTermsFieldsDiff = FieldsDiff<DiffableNewTermsFields>;

/**
 * It's an object which keys are the same as keys of DiffableRule, but values are
 * three-way diffs calculated for their values.
 * {
 *   name: ThreeWayDiff<RuleName>;
 *   tags: ThreeWayDiff<RuleTagArray>;
 *   etc
 * }
 */
export type RuleFieldsDiff = CommonFieldsDiff &
  (
    | CustomQueryFieldsDiff
    | SavedQueryFieldsDiff
    | EqlFieldsDiff
    | ThreatMatchFieldsDiff
    | ThresholdFieldsDiff
    | MachineLearningFieldsDiff
    | NewTermsFieldsDiff
  );

/**
 * Three-way diff calculated for rule formatted as JSON text.
 */
export type RuleJsonDiff = ThreeWayDiff<string>;

export interface RuleDiff {
  fields: RuleFieldsDiff;
  json: RuleJsonDiff;
  has_conflict: boolean;
}
