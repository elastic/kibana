/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { GLOBAL_CALENDAR } from '../../../../../legacy/plugins/ml/common/constants/calendars';

export interface CalendarEvent {
  calendar_id?: string;
  event_id?: string;
  description: string;
  start_time: number;
  end_time: number;
}

export class EventManager {
  private _client: any;
  constructor(client: any) {
    this._client = client;
  }

  async getCalendarEvents(calendarId: string) {
    try {
      const resp = await this._client('ml.events', { calendarId });

      return resp.events;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  // jobId is optional
  async getAllEvents(jobId?: string) {
    const calendarId = GLOBAL_CALENDAR;
    try {
      const resp = await this._client('ml.events', {
        calendarId,
        jobId,
      });

      return resp.events;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async addEvents(calendarId: string, events: CalendarEvent[]) {
    const body = { events };

    try {
      return await this._client('ml.addEvent', {
        calendarId,
        body,
      });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async deleteEvent(calendarId: string, eventId: string) {
    return this._client('ml.deleteEvent', { calendarId, eventId });
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
