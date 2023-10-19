/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export {
  scheduleAdHocRuleRunRequestBodySchema,
  scheduleAdHocRuleRunResponseBodySchema,
} from './schemas/latest';
export type {
  ScheduleAdHocRuleRunRequestBody,
  ScheduleAdHocRuleRunResponseBody,
} from './types/latest';

export {
  scheduleAdHocRuleRunRequestBodySchema as scheduleAdHocRuleRunRequestBodySchemaV1,
  scheduleAdHocRuleRunResponseBodySchema as scheduleAdHocRuleRunResponseBodySchemaV1,
} from './schemas/v1';
export type {
  ScheduleAdHocRuleRunRequestBody as ScheduleAdHocRuleRunRequestBodyV1,
  ScheduleAdHocRuleRunResponseBody as ScheduleAdHocRuleRunResponseBodyV1,
  ScheduleAdHocRuleRunResponse as ScheduleAdHocRuleRunResponseV1,
} from './types/v1';
