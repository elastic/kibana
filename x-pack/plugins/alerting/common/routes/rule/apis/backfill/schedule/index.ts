/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export {
  scheduleBackfillRequestBodySchema,
  scheduleBackfillResponseBodySchema,
} from './schemas/latest';
export type { ScheduleBackfillRequestBody, ScheduleBackfillResponseBody } from './types/latest';

export {
  scheduleBackfillRequestBodySchema as scheduleBackfillRequestBodySchemaV1,
  scheduleBackfillResponseBodySchema as scheduleBackfillResponseBodySchemaV1,
} from './schemas/v1';
export type {
  ScheduleBackfillRequestBody as ScheduleBackfillRequestBodyV1,
  ScheduleBackfillResponseBody as ScheduleBackfillResponseBodyV1,
  ScheduleBackfillResponse as ScheduleBackfillResponseV1,
} from './types/v1';
