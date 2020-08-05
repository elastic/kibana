/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import { calendarSchema, calendarIdSchema, calendarIdsSchema } from './schemas/calendars_schema';
import { CalendarManager, Calendar, FormCalendar } from '../models/calendar';

function getAllCalendars(context: RequestHandlerContext) {
  const cal = new CalendarManager(context.ml!.mlClient);
  return cal.getAllCalendars();
}

function getCalendar(context: RequestHandlerContext, calendarId: string) {
  const cal = new CalendarManager(context.ml!.mlClient);
  return cal.getCalendar(calendarId);
}

function newCalendar(context: RequestHandlerContext, calendar: FormCalendar) {
  const cal = new CalendarManager(context.ml!.mlClient);
  return cal.newCalendar(calendar);
}

function updateCalendar(context: RequestHandlerContext, calendarId: string, calendar: Calendar) {
  const cal = new CalendarManager(context.ml!.mlClient);
  return cal.updateCalendar(calendarId, calendar);
}

function deleteCalendar(context: RequestHandlerContext, calendarId: string) {
  const cal = new CalendarManager(context.ml!.mlClient);
  return cal.deleteCalendar(calendarId);
}

function getCalendarsByIds(context: RequestHandlerContext, calendarIds: string) {
  const cal = new CalendarManager(context.ml!.mlClient);
  return cal.getCalendarsByIds(calendarIds);
}

export function calendars({ router, mlLicense }: RouteInitialization) {
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await getAllCalendars(context);

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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      let returnValue;
      try {
        const calendarIds = request.params.calendarIds.split(',');

        if (calendarIds.length === 1) {
          returnValue = await getCalendar(context, calendarIds[0]);
        } else {
          returnValue = await getCalendarsByIds(context, calendarIds);
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const body = request.body;
        const resp = await newCalendar(context, body);

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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { calendarId } = request.params;
        const body = request.body;
        const resp = await updateCalendar(context, calendarId, body);

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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { calendarId } = request.params;
        const resp = await deleteCalendar(context, calendarId);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
