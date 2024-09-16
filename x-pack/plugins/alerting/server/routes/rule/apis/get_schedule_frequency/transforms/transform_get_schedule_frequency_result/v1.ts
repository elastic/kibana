/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetScheduleFrequencyResponseBodyV1 } from '../../../../../schemas/rule/apis/get_schedule_frequency';
import type { GetScheduleFrequencyResult } from '../../../../../../application/rule/methods/get_schedule_frequency';

export const transformGetScheduleFrequencyResult = (
  result: GetScheduleFrequencyResult
): GetScheduleFrequencyResponseBodyV1 => {
  return {
    total_scheduled_per_minute: result.totalScheduledPerMinute,
    remaining_schedules_per_minute: result.remainingSchedulesPerMinute,
  };
};
