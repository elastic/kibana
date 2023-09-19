/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ruleParamsSchema,
  actionParamsSchema,
  mappedParamsSchema,
  ruleExecutionStatusSchema,
  ruleLastRunSchema,
  monitoringSchema,
  rRuleSchema,
  ruleResponseSchema,
  ruleSnoozeScheduleSchema,
} from './schemas/latest';

export type {
  RuleParams,
  RuleResponse,
  RuleSnoozeSchedule,
  RuleLastRun,
  Monitoring,
} from './types/latest';

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
  ruleParamsSchema as ruleParamsSchemaV1,
  actionParamsSchema as actionParamsSchemaV1,
  mappedParamsSchema as mappedParamsSchemaV1,
  ruleExecutionStatusSchema as ruleExecutionStatusSchemaV1,
  ruleLastRunSchema as ruleLastRunSchemaV1,
  monitoringSchema as monitoringSchemaV1,
  rRuleSchema as rRuleSchemaV1,
  ruleResponseSchema as ruleResponseSchemaV1,
  ruleSnoozeScheduleSchema as ruleSnoozeScheduleSchemaV1,
} from './schemas/v1';

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

export type {
  RuleParams as RuleParamsV1,
  RuleResponse as RuleResponseV1,
  RuleSnoozeSchedule as RuleSnoozeScheduleV1,
  RuleLastRun as RuleLastRunV1,
  Monitoring as MonitoringV1,
} from './types/v1';
