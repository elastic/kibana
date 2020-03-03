/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import { calendarSchema } from './schemas/calendars_schema';
import { CalendarManager, Calendar, FormCalendar } from '../models/calendar';

function getAllCalendars(context: RequestHandlerContext) {
  const cal = new CalendarManager(context.ml!.mlClient.callAsCurrentUser);
  return cal.getAllCalendars();
}

function getCalendar(context: RequestHandlerContext, calendarId: string) {
  const cal = new CalendarManager(context.ml!.mlClient.callAsCurrentUser);
  return cal.getCalendar(calendarId);
}

function newCalendar(context: RequestHandlerContext, calendar: FormCalendar) {
  const cal = new CalendarManager(context.ml!.mlClient.callAsCurrentUser);
  return cal.newCalendar(calendar);
}

function updateCalendar(context: RequestHandlerContext, calendarId: string, calendar: Calendar) {
  const cal = new CalendarManager(context.ml!.mlClient.callAsCurrentUser);
  return cal.updateCalendar(calendarId, calendar);
}

function deleteCalendar(context: RequestHandlerContext, calendarId: string) {
  const cal = new CalendarManager(context.ml!.mlClient.callAsCurrentUser);
  return cal.deleteCalendar(calendarId);
}

function getCalendarsByIds(context: RequestHandlerContext, calendarIds: string) {
  const cal = new CalendarManager(context.ml!.mlClient.callAsCurrentUser);
  return cal.getCalendarsByIds(calendarIds);
}

export function calendars({ router, mlLicense }: RouteInitialization) {
  router.get(
    {
      path: '/api/ml/calendars',
      validate: false,
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

  router.get(
    {
      path: '/api/ml/calendars/{calendarIds}',
      validate: {
        params: schema.object({ calendarIds: schema.string() }),
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

  router.put(
    {
      path: '/api/ml/calendars',
      validate: {
        body: schema.object({ ...calendarSchema }),
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

  router.put(
    {
      path: '/api/ml/calendars/{calendarId}',
      validate: {
        params: schema.object({ calendarId: schema.string() }),
        body: schema.object({ ...calendarSchema }),
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

  router.delete(
    {
      path: '/api/ml/calendars/{calendarId}',
      validate: {
        params: schema.object({ calendarId: schema.string() }),
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
