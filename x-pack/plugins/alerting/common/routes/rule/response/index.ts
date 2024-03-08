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
  ruleResponseSchema,
  ruleSnoozeScheduleSchema,
  notifyWhenSchema,
  scheduleIdsSchema,
} from './schemas/latest';

export type {
  RuleParams,
  RuleResponse,
  RuleSnoozeSchedule,
  RuleLastRun,
  Monitoring,
} from './types/latest';

export {
  ruleParamsSchema as ruleParamsSchemaV1,
  actionParamsSchema as actionParamsSchemaV1,
  mappedParamsSchema as mappedParamsSchemaV1,
  ruleExecutionStatusSchema as ruleExecutionStatusSchemaV1,
  ruleLastRunSchema as ruleLastRunSchemaV1,
  monitoringSchema as monitoringSchemaV1,
  ruleResponseSchema as ruleResponseSchemaV1,
  ruleSnoozeScheduleSchema as ruleSnoozeScheduleSchemaV1,
  notifyWhenSchema as notifyWhenSchemaV1,
  scheduleIdsSchema as scheduleIdsSchemaV1,
  alertDelaySchema as alertDelaySchemaV1,
} from './schemas/v1';

export type {
  RuleParams as RuleParamsV1,
  RuleResponse as RuleResponseV1,
  RuleSnoozeSchedule as RuleSnoozeScheduleV1,
  RuleLastRun as RuleLastRunV1,
  Monitoring as MonitoringV1,
} from './types/v1';
