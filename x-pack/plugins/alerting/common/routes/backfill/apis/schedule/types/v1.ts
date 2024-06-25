/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { scheduleBodySchemaV1, scheduleResponseSchemaV1 } from '..';

export type ScheduleBackfillRequestBody = TypeOf<typeof scheduleBodySchemaV1>;
export type ScheduleBackfillResponseBody = TypeOf<typeof scheduleResponseSchemaV1>;

export interface ScheduleBackfillResponse {
  body: ScheduleBackfillResponseBody;
}
