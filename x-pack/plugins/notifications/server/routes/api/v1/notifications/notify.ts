/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import Joi from 'joi';
import Boom from 'boom';
import { Action, INotificationService, IServer } from '../../../../';

import { Lifecycle, Request, RouteOptions, Server, ServerRoute } from 'hapi';

interface INotification {
  action: string;
  data: any;
}

function isNotification(object: any): object is INotification {
  return 'action' in object && 'data' in object;
}

/**
 * Check the incoming request parameters to see if the action should be allowed to fire.
 *
 * @param {Action} action The action selected by the user.
 * @param {String} actionId The ID of the requested action from the user.
 * @param {Object} data The incoming data from the user.
 * @returns {Object|null} The error object, or null if no error.
 */
export function checkForErrors(action: Action, data: any) {
  let validLicense = false;

  try {
    validLicense = action.isLicenseValid();
  } catch (e) {
    // validLicense === false
  }

  if (validLicense === false) {
    return {
      message: `Unable to perform '${action.getName()}' action due to the current license.`,
    };
  }
  const fields = action.getMissingFields(data);

  if (fields.length !== 0) {
    return {
      message: `Unable to perform '${action.getName()}' action due to missing required fields.`,
      fields,
    };
  }

  return null;
}

/**
 * Attempt to send the {@code data} as a notification.
 *
 * @param {Object} server Kibana server object.
 * @param {NotificationService} notificationService The notification service singleton.
 * @param {String} actionId The specified action's ID.
 * @param {Function} data The notification data to send via the specified action.
 * @param {Function} _checkForErrors Exposed for testing.
 */
export async function sendNotification(
  server: Server | IServer,
  notificationService: INotificationService,
  actionId: string,
  data: any,
  { _checkForErrors = checkForErrors } = {}
): Promise<Boom | object> {
  const action: Action | undefined = notificationService.getActionForId(actionId);
  if (action instanceof Action) {
    const error = _checkForErrors(action, data);

    if (error === null) {
      return action
        .performAction(data)
        .then(result => result.toJson())
        .catch(err => Boom.boomify(err)); // by API definition, this should never happen as performAction isn't allow to throw errrors
    }
    const msg = error && error.message ? error.message : '';
    server.log(['actions', 'error'], msg);
    return Boom.badRequest(msg);
  } else {
    const msg = `Unrecognized action ${actionId}.`;
    server.log(['actions', 'error'], msg);
    return Boom.badRequest(msg);
  }
}

/**
 * Notification Service route to perform actions (aka send data).
 */
export function notificationServiceSendRoute(
  server: Server | IServer,
  notificationService: INotificationService
) {
  const options: RouteOptions = {};
  const handler: Lifecycle.Method = (req: Request) => {
    if (isNotification(req.payload)) {
      return sendNotification(server, notificationService, req.payload.action, req.payload.data);
    }

    const msg = `Unrecognized notification payload.`;
    server.log(['actions', 'error'], msg);
    return Boom.badRequest(msg);
  };

  const route: ServerRoute = {
    method: 'POST',
    path: '/api/notifications/v1/notify',
    options,
    handler,
  };

  server.route(route);
}
