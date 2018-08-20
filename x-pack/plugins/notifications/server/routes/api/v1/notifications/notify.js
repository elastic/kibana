/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { boomify } from 'boom';

/**
 * Check the incoming request parameters to see if the action should be allowed to fire.
 *
 * @param {Object|null} action The action selected by the user.
 * @param {String} actionId The ID of the requested action from the user.
 * @param {Object} data The incoming data from the user.
 * @returns {Object|null} The error object, or null if no error.
 */
export function checkForErrors(action, actionId, data) {
  if (action === null) {
    return {
      message: `Unrecognized action: '${actionId}'.`,
    };
  } else {
    let validLicense = false;

    try {
      validLicense = action.isLicenseValid();
    } catch (e) {
      // validLicense === false
    }

    if (validLicense === false) {
      return {
        message: `Unable to perform '${action.name}' action due to the current license.`,
      };
    }
  }

  const fields = action.getMissingFields(data);

  if (fields.length !== 0) {
    return {
      message: `Unable to perform '${action.name}' action due to missing required fields.`,
      fields
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
export async function sendNotification(server, notificationService, actionId, data, { _checkForErrors = checkForErrors } = { }) {
  const action = notificationService.getActionForId(actionId);
  const error = _checkForErrors(action, actionId, data);

  if (error === null) {
    return action.performAction(data)
      .then(result => result.toJson())
      .catch(err => boomify(err)); // by API definition, this should never happen as performAction isn't allow to throw errrors
  }

  server.log(['actions', 'error'], error.message);

  return {
    status_code: 400,
    ok: false,
    message: `Error: ${error.message}`,
    error,
  };
}

/**
 * Notification Service route to perform actions (aka send data).
 */
export function notificationServiceSendRoute(server, notificationService) {
  server.route({
    method: 'POST',
    path: '/api/notifications/v1/notify',
    config: {
      validate: {
        payload: Joi.object({
          action: Joi.string().required(),
          data: Joi.object({
            from: Joi.string(),
            to: Joi.string(),
            subject: Joi.string().required(),
            markdown: Joi.string(),
          }).required()
        })
      }
    },
    handler: (req) => {
      const actionId = req.payload.action;
      const data = req.payload.data;

      sendNotification(server, notificationService, actionId, data);
    },
  });
}
