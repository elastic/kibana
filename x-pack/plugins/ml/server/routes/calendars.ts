/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import { calendarSchema, calendarIdSchema, calendarIdsSchema } from './schemas/calendars_schema';
import { CalendarManager, Calendar, FormCalendar } from '../models/calendar';
import type { MlClient } from '../lib/ml_client';

function getAllCalendars(mlClient: MlClient) {
  const cal = new CalendarManager(mlClient);
  return cal.getAllCalendars();
}

function getCalendar(mlClient: MlClient, calendarId: string) {
  const cal = new CalendarManager(mlClient);
  return cal.getCalendar(calendarId);
}

function newCalendar(mlClient: MlClient, calendar: FormCalendar) {
  const cal = new CalendarManager(mlClient);
  return cal.newCalendar(calendar);
}

function updateCalendar(mlClient: MlClient, calendarId: string, calendar: Calendar) {
  const cal = new CalendarManager(mlClient);
  return cal.updateCalendar(calendarId, calendar);
}

function deleteCalendar(mlClient: MlClient, calendarId: string) {
  const cal = new CalendarManager(mlClient);
  return cal.deleteCalendar(calendarId);
}

function getCalendarsByIds(mlClient: MlClient, calendarIds: string) {
  const cal = new CalendarManager(mlClient);
  return cal.getCalendarsByIds(calendarIds);
}

export function calendars({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup Calendars
   *
   * @api {get} /api/ml/calendars Gets calendars
   * @apiName GetCalendars
   * @apiDescription Gets calendars - size limit has been explicitly set to 1000
   */
  router.get(
    {
      path: '/api/ml/calendars',
      validate: false,
      options: {
        tags: ['access:ml:canGetCalendars'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
      try {
        const resp = await getAllCalendars(mlClient);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Calendars
   *
   * @api {get} /api/ml/calendars/:calendarIds Gets a calendar
   * @apiName GetCalendarById
   * @apiDescription Gets calendar by id
   *
   * @apiSchema (params) calendarIdsSchema
   */
  router.get(
    {
      path: '/api/ml/calendars/{calendarIds}',
      validate: {
        params: calendarIdsSchema,
      },
      options: {
        tags: ['access:ml:canGetCalendars'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      let returnValue;
      try {
        const calendarIds = request.params.calendarIds.split(',');

        if (calendarIds.length === 1) {
          returnValue = await getCalendar(mlClient, calendarIds[0]);
        } else {
          returnValue = await getCalendarsByIds(mlClient, calendarIds);
        }

        return response.ok({
          body: returnValue,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Calendars
   *
   * @api {put} /api/ml/calendars Creates a calendar
   * @apiName PutCalendars
   * @apiDescription Creates a calendar
   *
   * @apiSchema (body) calendarSchema
   */
  router.put(
    {
      path: '/api/ml/calendars',
      validate: {
        body: calendarSchema,
      },
      options: {
        tags: ['access:ml:canCreateCalendar'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = request.body;
        const resp = await newCalendar(mlClient, body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Calendars
   *
   * @api {put} /api/ml/calendars/:calendarId Updates a calendar
   * @apiName UpdateCalendarById
   * @apiDescription Updates a calendar
   *
   * @apiSchema (params) calendarIdSchema
   * @apiSchema (body) calendarSchema
   */
  router.put(
    {
      path: '/api/ml/calendars/{calendarId}',
      validate: {
        params: calendarIdSchema,
        body: calendarSchema,
      },
      options: {
        tags: ['access:ml:canCreateCalendar'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { calendarId } = request.params;
        const body = request.body;
        const resp = await updateCalendar(mlClient, calendarId, body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Calendars
   *
   * @api {delete} /api/ml/calendars/:calendarId Deletes a calendar
   * @apiName DeleteCalendarById
   * @apiDescription Deletes a calendar
   *
   * @apiSchema (params) calendarIdSchema
   */
  router.delete(
    {
      path: '/api/ml/calendars/{calendarId}',
      validate: {
        params: calendarIdSchema,
      },
      options: {
        tags: ['access:ml:canDeleteCalendar'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { calendarId } = request.params;
        const resp = await deleteCalendar(mlClient, calendarId);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
