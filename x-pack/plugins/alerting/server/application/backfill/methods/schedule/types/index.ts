/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  scheduleBackfillErrorSchema,
  scheduleBackfillParamSchema,
  scheduleBackfillParamsSchema,
  scheduleBackfillResultSchema,
  scheduleBackfillResultsSchema,
} from '../schemas';

export type ScheduleBackfillParam = TypeOf<typeof scheduleBackfillParamSchema>;
export type ScheduleBackfillParams = TypeOf<typeof scheduleBackfillParamsSchema>;
export type ScheduleBackfillResult = TypeOf<typeof scheduleBackfillResultSchema>;
export type ScheduleBackfillResults = TypeOf<typeof scheduleBackfillResultsSchema>;
export type ScheduleBackfillError = TypeOf<typeof scheduleBackfillErrorSchema>;
