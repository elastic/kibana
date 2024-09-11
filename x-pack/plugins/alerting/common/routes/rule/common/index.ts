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
} from './constants/latest';

export type {
  RuleNotifyWhen,
  RuleLastRunOutcomeValues,
  RuleExecutionStatusValues,
  RuleExecutionStatusErrorReason,
  RuleExecutionStatusWarningReason,
} from './constants/latest';

export {
  ruleNotifyWhen as ruleNotifyWhenV1,
  ruleLastRunOutcomeValues as ruleLastRunOutcomeValuesV1,
  ruleExecutionStatusValues as ruleExecutionStatusValuesV1,
  ruleExecutionStatusErrorReason as ruleExecutionStatusErrorReasonV1,
  ruleExecutionStatusWarningReason as ruleExecutionStatusWarningReasonV1,
} from './constants/v1';

export type {
  RuleNotifyWhen as RuleNotifyWhenV1,
  RuleLastRunOutcomeValues as RuleLastRunOutcomeValuesV1,
  RuleExecutionStatusValues as RuleExecutionStatusValuesV1,
  RuleExecutionStatusErrorReason as RuleExecutionStatusErrorReasonV1,
  RuleExecutionStatusWarningReason as RuleExecutionStatusWarningReasonV1,
} from './constants/v1';

export { forbiddenErrorSchema } from './schemas/latest';

export { forbiddenErrorSchema as forbiddenErrorSchemaV1 } from './schemas/v1';
