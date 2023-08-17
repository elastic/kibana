/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ruleSnoozeScheduleSchema,
  bulkEditOperationsSchema,
  bulkEditRulesRequestBodySchema,
} from './schemas/latest';
export type {
  RuleSnoozeSchedule,
  BulkEditRulesRequestBody,
  BulkEditRulesResponse,
} from './types/latest';

export {
  ruleSnoozeScheduleSchema as ruleSnoozeScheduleSchemaV1,
  bulkEditOperationsSchema as bulkEditOperationsSchemaV1,
  bulkEditRulesRequestBodySchema as bulkEditRulesRequestBodySchemaV1,
} from './schemas/v1';
export type {
  RuleSnoozeSchedule as RuleSnoozeScheduleV1,
  BulkEditRulesRequestBody as BulkEditRulesRequestBodyV1,
  BulkEditRulesResponse as BulkEditRulesResponseV1,
} from './types/v1';
