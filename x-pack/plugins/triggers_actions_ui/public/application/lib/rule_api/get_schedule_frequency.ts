/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { GetScheduleFrequencyResponseBody } from '@kbn/alerting-plugin/common/routes/rule/apis/get_schedule_frequency';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export interface GetScheduleFrequencyResult {
  totalScheduledPerMinute: number;
  remainingSchedulesPerMinute: number;
}

const transformResponse = (response: GetScheduleFrequencyResponseBody) => {
  return {
    totalScheduledPerMinute: response.total_scheduled_per_minute,
    remainingSchedulesPerMinute: response.remaining_schedules_per_minute,
  };
};

export const getScheduleFrequency = async ({
  http,
}: {
  http: HttpSetup;
}): Promise<GetScheduleFrequencyResult> => {
  const res = await http.get<GetScheduleFrequencyResponseBody>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_schedule_frequency`
  );
  return transformResponse(res);
};
