/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { GLOBAL_CALENDAR } from '../../../common/constants/calendars';

export interface CalendarEvent {
  calendar_id?: string;
  event_id?: string;
  description: string;
  start_time: number;
  end_time: number;
}

export class EventManager {
  private _asInternalUser: IScopedClusterClient['asInternalUser'];
  constructor({ asInternalUser }: IScopedClusterClient) {
    this._asInternalUser = asInternalUser;
  }

  async getCalendarEvents(calendarId: string) {
    const { body } = await this._asInternalUser.ml.getCalendarEvents({ calendar_id: calendarId });

    return body.events;
  }

  // jobId is optional
  async getAllEvents(jobId?: string) {
    const calendarId = GLOBAL_CALENDAR;
    const { body } = await this._asInternalUser.ml.getCalendarEvents({
      calendar_id: calendarId,
      job_id: jobId,
    });

    return body.events;
  }

  async addEvents(calendarId: string, events: CalendarEvent[]) {
    const body = { events };

    return await this._asInternalUser.ml.postCalendarEvents({
      calendar_id: calendarId,
      body,
    });
  }

  async deleteEvent(calendarId: string, eventId: string) {
    return this._asInternalUser.ml.deleteCalendarEvent({
      calendar_id: calendarId,
      event_id: eventId,
    });
  }

  isEqual(ev1: CalendarEvent, ev2: CalendarEvent) {
    return (
      ev1.event_id === ev2.event_id &&
      ev1.description === ev2.description &&
      ev1.start_time === ev2.start_time &&
      ev1.end_time === ev2.end_time
    );
  }
}
