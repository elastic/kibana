/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DiffableAllFields,
  DiffableCommonFields,
  DiffableCustomQueryFields,
  DiffableEqlFields,
  DiffableEsqlFields,
  DiffableMachineLearningFields,
  DiffableNewTermsFields,
  DiffableSavedQueryFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
} from '../diffable_rule/diffable_rule';

import type { FieldsDiff } from './fields_diff';

export type AllFieldsDiff = FieldsDiff<DiffableAllFields>;
export type CommonFieldsDiff = FieldsDiff<DiffableCommonFields>;
export type CustomQueryFieldsDiff = FieldsDiff<DiffableCustomQueryFields>;
export type SavedQueryFieldsDiff = FieldsDiff<DiffableSavedQueryFields>;
export type EqlFieldsDiff = FieldsDiff<DiffableEqlFields>;
export type EsqlFieldsDiff = FieldsDiff<DiffableEsqlFields>;
export type ThreatMatchFieldsDiff = FieldsDiff<DiffableThreatMatchFields>;
export type ThresholdFieldsDiff = FieldsDiff<DiffableThresholdFields>;
export type MachineLearningFieldsDiff = FieldsDiff<DiffableMachineLearningFields>;
export type NewTermsFieldsDiff = FieldsDiff<DiffableNewTermsFields>;

/**
 * It's an object which keys are the same as keys of DiffableRule, but values are
 * three-way diffs calculated for their values.
 *
 * @example
 * {
 *   name: ThreeWayDiff<RuleName>;
 *   tags: ThreeWayDiff<RuleTagArray>;
 *   // etc
 * }
 */
export type RuleFieldsDiff = CommonFieldsDiff &
  (
    | CustomQueryFieldsDiff
    | SavedQueryFieldsDiff
    | EqlFieldsDiff
    | EsqlFieldsDiff
    | ThreatMatchFieldsDiff
    | ThresholdFieldsDiff
    | MachineLearningFieldsDiff
    | NewTermsFieldsDiff
  );

interface BaseRuleDiff {
  num_fields_with_updates: number;
  num_fields_with_conflicts: number;
  num_fields_with_non_solvable_conflicts: number;
}
/**
 * Full rule diff contains diffs for all the top-level rule fields.
 * Even if there's no change at all to a given field, its diff will be included in this object.
 * This diff can be useful for internal server-side calculations or debugging.
 * Note that this is a pretty large object so returning it from the API might be undesirable.
 */
export interface FullRuleDiff extends BaseRuleDiff {
  fields: RuleFieldsDiff;
}

/**
 * Partial rule diff contains diffs only for those rule fields that have some changes to them.
 * This diff can be useful for returning info from REST API endpoints because its size is tolerable.
 */
export interface PartialRuleDiff extends BaseRuleDiff {
  fields: Partial<RuleFieldsDiff>;
}

export type RuleFieldsDiffWithDataSource =
  | CustomQueryFieldsDiff
  | SavedQueryFieldsDiff
  | EqlFieldsDiff
  | ThreatMatchFieldsDiff
  | ThresholdFieldsDiff
  | NewTermsFieldsDiff;

export type RuleFieldsDiffWithKqlQuery =
  | CustomQueryFieldsDiff
  | SavedQueryFieldsDiff
  | ThreatMatchFieldsDiff
  | ThresholdFieldsDiff
  | NewTermsFieldsDiff;

export type RuleFieldsDiffWithEqlQuery = EqlFieldsDiff;

export type RuleFieldsDiffWithEsqlQuery = EsqlFieldsDiff;

export type RuleFieldsDiffWithThreatQuery = ThreatMatchFieldsDiff;

export type RuleFieldsDiffWithThreshold = ThresholdFieldsDiff;
