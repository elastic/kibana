/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type MlCalendarId = string;

export interface MlCalendar {
  calendar_id: MlCalendarId;
  description: string;
  events: any[];
  job_ids: string[];
  total_job_count?: number;
}

export interface UpdateCalendar extends MlCalendar {
  calendarId: MlCalendarId;
}

export type MlCalendarEvent = estypes.MlCalendarEvent & {
  // !!!!!!! move this to the common types
  force_time_shift?: number;
  skip_result?: boolean;
  skip_model_update?: boolean;
};
