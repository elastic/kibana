/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { CalendarManager } from '../models/calendar';


function getAllCalendars(callWithRequest) {
  const cal = new CalendarManager(callWithRequest);
  return cal.getAllCalendars();
}

function getCalendar(callWithRequest, calendarId) {
  const cal = new CalendarManager(callWithRequest);
  return cal.getCalendar(calendarId);
}

function newCalendar(callWithRequest, calendar) {
  const cal = new CalendarManager(callWithRequest);
  return cal.newCalendar(calendar);
}

function updateCalendar(callWithRequest, calendarId, calendar) {
  const cal = new CalendarManager(callWithRequest);
  return cal.updateCalendar(calendarId, calendar);
}

function deleteCalendar(callWithRequest, calendarId) {
  const cal = new CalendarManager(callWithRequest);
  return cal.deleteCalendar(calendarId);
}

export function calendars(server, commonRouteConfig) {

  server.route({
    method: 'GET',
    path: '/api/ml/calendars',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      return getAllCalendars(callWithRequest)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/calendars/{calendarId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const calendarId = request.params.calendarId;
      return getCalendar(callWithRequest, calendarId)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/ml/calendars',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const body = request.payload;
      return newCalendar(callWithRequest, body)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/ml/calendars/{calendarId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const calendarId = request.params.calendarId;
      const body = request.payload;
      return updateCalendar(callWithRequest, calendarId, body)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/ml/calendars/{calendarId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const calendarId = request.params.calendarId;
      return deleteCalendar(callWithRequest, calendarId)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
