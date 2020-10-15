/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type CalendarId = string;

export interface Calendar {
  calendar_id: CalendarId;
  description: string;
  events: any[];
  job_ids: string[];
}

export interface UpdateCalendar extends Calendar {
  calendarId: CalendarId;
}
