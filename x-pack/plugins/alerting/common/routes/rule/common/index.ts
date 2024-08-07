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
  MIN_LOOK_BACK_WINDOW,
  MAX_LOOK_BACK_WINDOW,
  MIN_STATUS_CHANGE_THRESHOLD,
  MAX_STATUS_CHANGE_THRESHOLD,
} from './constants/latest';

export { flappingSchema } from './flapping/schemas/latest';

export type {
  RuleNotifyWhen,
  RuleLastRunOutcomeValues,
  RuleExecutionStatusValues,
  RuleExecutionStatusErrorReason,
  RuleExecutionStatusWarningReason,
} from './constants/latest';

export type { Flapping } from './flapping/types/latest';

export {
  ruleNotifyWhen as ruleNotifyWhenV1,
  ruleLastRunOutcomeValues as ruleLastRunOutcomeValuesV1,
  ruleExecutionStatusValues as ruleExecutionStatusValuesV1,
  ruleExecutionStatusErrorReason as ruleExecutionStatusErrorReasonV1,
  ruleExecutionStatusWarningReason as ruleExecutionStatusWarningReasonV1,
  MIN_LOOK_BACK_WINDOW as MIN_LOOK_BACK_WINDOW_V1,
  MAX_LOOK_BACK_WINDOW as MAX_LOOK_BACK_WINDOW_V1,
  MIN_STATUS_CHANGE_THRESHOLD as MIN_STATUS_CHANGE_THRESHOLD_V1,
  MAX_STATUS_CHANGE_THRESHOLD as MAX_STATUS_CHANGE_THRESHOLD_V1,
} from './constants/v1';

export { flappingSchema as flappingSchemaV1 } from './flapping/schemas/v1';

export type {
  RuleNotifyWhen as RuleNotifyWhenV1,
  RuleLastRunOutcomeValues as RuleLastRunOutcomeValuesV1,
  RuleExecutionStatusValues as RuleExecutionStatusValuesV1,
  RuleExecutionStatusErrorReason as RuleExecutionStatusErrorReasonV1,
  RuleExecutionStatusWarningReason as RuleExecutionStatusWarningReasonV1,
} from './constants/v1';

export type { Flapping as FlappingV1 } from './flapping/types/v1';
