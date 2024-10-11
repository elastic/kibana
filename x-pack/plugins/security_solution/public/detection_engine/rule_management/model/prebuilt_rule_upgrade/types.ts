/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NON_UPGRADEABLE_DIFFABLE_FIELDS } from './constants';
import type {
  DiffableCommonFields,
  DiffableCustomQueryFields,
  DiffableEqlFields,
  DiffableEsqlFields,
  DiffableMachineLearningFields,
  DiffableNewTermsFields,
  DiffableSavedQueryFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
  RuleFieldsDiff,
} from '../../../../../common/api/detection_engine';

export type NonUpgradeableDiffableFields = (typeof NON_UPGRADEABLE_DIFFABLE_FIELDS)[number];

export type UpgradeableDiffableFields = Exclude<keyof RuleFieldsDiff, NonUpgradeableDiffableFields>;

export type UpgradeableCommonFields = Exclude<
  keyof DiffableCommonFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableCustomQueryFields = Exclude<
  keyof DiffableCustomQueryFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableSavedQueryFields = Exclude<
  keyof DiffableSavedQueryFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableEqlFields = Exclude<keyof DiffableEqlFields, NonUpgradeableDiffableFields>;

export type UpgradeableEsqlFields = Exclude<keyof DiffableEsqlFields, NonUpgradeableDiffableFields>;

export type UpgradeableThreatMatchFields = Exclude<
  keyof DiffableThreatMatchFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableThresholdFields = Exclude<
  keyof DiffableThresholdFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableMachineLearningFields = Exclude<
  keyof DiffableMachineLearningFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableNewTermsFields = Exclude<
  keyof DiffableNewTermsFields,
  NonUpgradeableDiffableFields
>;
