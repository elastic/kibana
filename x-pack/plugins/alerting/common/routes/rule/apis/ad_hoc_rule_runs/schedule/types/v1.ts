/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import {
  scheduleAdHocRuleRunRequestBodySchemaV1,
  scheduleAdHocRuleRunResponseBodySchemaV1,
} from '..';

export type ScheduleAdHocRuleRunRequestBody = TypeOf<
  typeof scheduleAdHocRuleRunRequestBodySchemaV1
>;
export type ScheduleAdHocRuleRunResponseBody = TypeOf<
  typeof scheduleAdHocRuleRunResponseBodySchemaV1
>;

export interface ScheduleAdHocRuleRunResponse {
  body: ScheduleAdHocRuleRunRequestBody;
}
