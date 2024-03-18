/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ruleNotifyWhen,
  ruleLastRunOutcomeValues,
  ruleExecutionStatusValues,
  ruleExecutionStatusErrorReason,
  ruleExecutionStatusWarningReason,
  filterStateStore,
} from './constants/latest';

export type {
  RuleNotifyWhen,
  RuleLastRunOutcomeValues,
  RuleExecutionStatusValues,
  RuleExecutionStatusErrorReason,
  RuleExecutionStatusWarningReason,
  FilterStateStore,
} from './constants/latest';

export {
  ruleNotifyWhen as ruleNotifyWhenV1,
  ruleLastRunOutcomeValues as ruleLastRunOutcomeValuesV1,
  ruleExecutionStatusValues as ruleExecutionStatusValuesV1,
  ruleExecutionStatusErrorReason as ruleExecutionStatusErrorReasonV1,
  ruleExecutionStatusWarningReason as ruleExecutionStatusWarningReasonV1,
  filterStateStore as filterStateStoreV1,
} from './constants/v1';

export type {
  RuleNotifyWhen as RuleNotifyWhenV1,
  RuleLastRunOutcomeValues as RuleLastRunOutcomeValuesV1,
  RuleExecutionStatusValues as RuleExecutionStatusValuesV1,
  RuleExecutionStatusErrorReason as RuleExecutionStatusErrorReasonV1,
  RuleExecutionStatusWarningReason as RuleExecutionStatusWarningReasonV1,
  FilterStateStore as FilterStateStoreV1,
} from './constants/v1';
