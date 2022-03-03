/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { GLOBAL_CALENDAR } from '../../../common/constants/calendars';
import type { MlClient } from '../../lib/ml_client';

type ScheduledEvent = estypes.MlCalendarEvent;

export class EventManager {
  private _mlClient: MlClient;
  constructor(mlClient: MlClient) {
    this._mlClient = mlClient;
  }

  async getCalendarEvents(calendarId: string) {
    const body = await this._mlClient.getCalendarEvents({ calendar_id: calendarId });
    return body.events;
  }

  // jobId is optional
  async getAllEvents(jobId?: string) {
    const calendarId = GLOBAL_CALENDAR;
    const body = await this._mlClient.getCalendarEvents({
      calendar_id: calendarId,
      job_id: jobId,
    });

    return body.events;
  }

  async addEvents(calendarId: string, events: ScheduledEvent[]) {
    const body = { events };

    return await this._mlClient.postCalendarEvents({
      calendar_id: calendarId,
      body,
    });
  }

  async deleteEvent(calendarId: string, eventId: string) {
    return this._mlClient.deleteCalendarEvent({
      calendar_id: calendarId,
      event_id: eventId,
    });
  }

  isEqual(ev1: ScheduledEvent, ev2: ScheduledEvent) {
    return (
      ev1.event_id === ev2.event_id &&
      ev1.description === ev2.description &&
      ev1.start_time === ev2.start_time &&
      ev1.end_time === ev2.end_time
    );
  }
}
