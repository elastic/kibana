/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { scheduleBackfillRequestBodySchemaV1, scheduleBackfillResponseBodySchemaV1 } from '..';

export type ScheduleBackfillRequestBody = TypeOf<typeof scheduleBackfillRequestBodySchemaV1>;
export type ScheduleBackfillResponseBody = TypeOf<typeof scheduleBackfillResponseBodySchemaV1>;

export interface ScheduleBackfillResponse {
  body: ScheduleBackfillRequestBody;
}
