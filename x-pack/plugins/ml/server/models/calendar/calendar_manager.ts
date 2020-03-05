/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference } from 'lodash';
import Boom from 'boom';
import { IScopedClusterClient } from 'src/core/server';
import { EventManager, CalendarEvent } from './event_manager';

interface BasicCalendar {
  job_ids: string[];
  description?: string;
  events: CalendarEvent[];
}

export interface Calendar extends BasicCalendar {
  calendar_id: string;
}

export interface FormCalendar extends BasicCalendar {
  calendarId: string;
}

export class CalendarManager {
  private _client: IScopedClusterClient['callAsCurrentUser'];
  private _eventManager: any;

  constructor(client: any) {
    this._client = client;
    this._eventManager = new EventManager(client);
  }

  async getCalendar(calendarId: string) {
    try {
      const resp = await this._client('ml.calendars', {
        calendarId,
      });

      const calendars = resp.calendars;
      if (calendars.length) {
        const calendar = calendars[0];
        calendar.events = await this._eventManager.getCalendarEvents(calendarId);
        return calendar;
      } else {
        throw Boom.notFound(`Calendar with the id "${calendarId}" not found`);
      }
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async getAllCalendars() {
    try {
      const calendarsResp = await this._client('ml.calendars');

      const events: CalendarEvent[] = await this._eventManager.getAllEvents();
      const calendars: Calendar[] = calendarsResp.calendars;
      calendars.forEach(cal => (cal.events = []));

      // loop events and combine with related calendars
      events.forEach(event => {
        const calendar = calendars.find(cal => cal.calendar_id === event.calendar_id);
        if (calendar) {
          calendar.events.push(event);
        }
      });
      return calendars;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  /**
   * Gets a list of calendar objects based on provided ids.
   * @param calendarIds
   * @returns {Promise<*>}
   */
  async getCalendarsByIds(calendarIds: string) {
    try {
      const calendars: Calendar[] = await this.getAllCalendars();
      return calendars.filter(calendar => calendarIds.includes(calendar.calendar_id));
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async newCalendar(calendar: FormCalendar) {
    const calendarId = calendar.calendarId;
    const events = calendar.events;
    delete calendar.calendarId;
    delete calendar.events;
    try {
      await this._client('ml.addCalendar', {
        calendarId,
        body: calendar,
      });

      if (events.length) {
        await this._eventManager.addEvents(calendarId, events);
      }

      // return the newly created calendar
      return await this.getCalendar(calendarId);
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async updateCalendar(calendarId: string, calendar: Calendar) {
    const origCalendar: Calendar = await this.getCalendar(calendarId);
    try {
      // update job_ids
      const jobsToAdd = difference(calendar.job_ids, origCalendar.job_ids);
      const jobsToRemove = difference(origCalendar.job_ids, calendar.job_ids);

      // workout the differences between the original events list and the new one
      // if an event has no event_id, it must be new
      const eventsToAdd = calendar.events.filter(
        event => origCalendar.events.find(e => this._eventManager.isEqual(e, event)) === undefined
      );

      // if an event in the original calendar cannot be found, it must have been deleted
      const eventsToRemove: CalendarEvent[] = origCalendar.events.filter(
        event => calendar.events.find(e => this._eventManager.isEqual(e, event)) === undefined
      );

      // note, both of the loops below could be removed if the add and delete endpoints
      // allowed multiple job_ids

      // add all new jobs
      if (jobsToAdd.length) {
        await this._client('ml.addJobToCalendar', {
          calendarId,
          jobId: jobsToAdd.join(','),
        });
      }

      // remove all removed jobs
      if (jobsToRemove.length) {
        await this._client('ml.removeJobFromCalendar', {
          calendarId,
          jobId: jobsToRemove.join(','),
        });
      }

      // add all new events
      if (eventsToAdd.length !== 0) {
        await this._eventManager.addEvents(calendarId, eventsToAdd);
      }

      // remove all removed events
      await Promise.all(
        eventsToRemove.map(async event => {
          await this._eventManager.deleteEvent(calendarId, event.event_id);
        })
      );
    } catch (error) {
      throw Boom.badRequest(error);
    }

    // return the updated calendar
    return await this.getCalendar(calendarId);
  }

  async deleteCalendar(calendarId: string) {
    return this._client('ml.deleteCalendar', { calendarId });
  }
}
