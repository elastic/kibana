/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CalendarId = string;

export interface Calendar {
  calendar_id: CalendarId;
  description: string;
  events: any[];
  job_ids: string[];
  total_job_count?: number;
}

export interface UpdateCalendar extends Calendar {
  calendarId: CalendarId;
}
