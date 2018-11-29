/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkForErrors, sendNotification } from './notify';
import { boomify } from 'boom';

describe('notifications/routes/send', () => {

  const id = 'notifications-test';
  const notification = { fake: true };

  describe('checkForErrors', () => {

    it('returns unrecognized action for null action', () => {
      expect(checkForErrors(null, id, { })).toEqual({
        message: `Unrecognized action: '${id}'.`,
      });
    });

    it('returns invalid license if license check throws an error', () => {
      const action = {
        name: 'Test Action',
        isLicenseValid: () => {
          throw new Error();
        },
      };

      expect(checkForErrors(action, id, { })).toEqual({
        message: `Unable to perform '${action.name}' action due to the current license.`,
      });
    });

    it('returns invalid license if license is invalid', () => {
      const action = {
        name: 'Test Action',
        isLicenseValid: () => false,
      };

      expect(checkForErrors(action, id, { })).toEqual({
        message: `Unable to perform '${action.name}' action due to the current license.`,
      });
    });

    it('returns fields related to missing data', () => {
      const fields = [ { field: 1 } ];
      const action = {
        name: 'Test Action',
        isLicenseValid: () => true,
        getMissingFields: (data) => {
          expect(data).toBe(notification);

          return fields;
        },
      };

      const error = checkForErrors(action, id, notification);

      expect(error).toEqual({
        message: `Unable to perform '${action.name}' action due to missing required fields.`,
        fields
      });
    });

    it('returns null if action is usable', () => {
      const notification = { fake: true };
      const action = {
        name: 'Test Action',
        isLicenseValid: () => true,
        getMissingFields: (data) => {
          expect(data).toBe(notification);

          return [];
        },
      };

      expect(checkForErrors(action, id, notification)).toBeNull();
    });

  });

  describe('sendNotification', () => {

    it('replies with error object for bad request', async () => {
      const error = {
        message: 'TEST - expected',
        fields: [ { fake: 1 } ],
      };
      const action = { };
      const server = {
        log: jest.fn(),
      };
      const notificationService = {
        getActionForId: jest.fn().mockReturnValue(action),
      };
      const checkForErrors = jest.fn().mockReturnValue(error);

      const sendResponse = await sendNotification(server, notificationService, id, notification, { _checkForErrors: checkForErrors });

      expect(notificationService.getActionForId).toHaveBeenCalledTimes(1);
      expect(notificationService.getActionForId).toHaveBeenCalledWith(id);
      expect(checkForErrors).toHaveBeenCalledTimes(1);
      expect(checkForErrors).toHaveBeenCalledWith(action, id, notification);
      expect(server.log).toHaveBeenCalledTimes(1);
      expect(server.log).toHaveBeenCalledWith(['actions', 'error'], error.message);

      expect(sendResponse).toEqual({
        status_code: 400,
        ok: false,
        message: `Error: ${error.message}`,
        error,
      });
    });

    it('replies with action result JSON', async () => {
      const response = { ok: true, message: 'Test' };
      const result = {
        toJson: () => response,
      };
      const action = {
        performAction: jest.fn().mockReturnValue(Promise.resolve(result))
      };
      const server = { };
      const notificationService = {
        getActionForId: jest.fn().mockReturnValue(action),
      };
      const checkForErrors = jest.fn().mockReturnValue(null);

      const sendResponse = await sendNotification(server, notificationService, id, notification, { _checkForErrors: checkForErrors });

      expect(notificationService.getActionForId).toHaveBeenCalledTimes(1);
      expect(notificationService.getActionForId).toHaveBeenCalledWith(id);
      expect(checkForErrors).toHaveBeenCalledTimes(1);
      expect(checkForErrors).toHaveBeenCalledWith(action, id, notification);

      expect(sendResponse).toEqual(response);
    });

    it('replies with unexpected result error', async () => {
      const error = new Error();
      const action = {
        performAction: jest.fn().mockReturnValue(Promise.reject(error))
      };
      const server = { };
      const notificationService = {
        getActionForId: jest.fn().mockReturnValue(action),
      };
      const checkForErrors = jest.fn().mockReturnValue(null);

      const sendResponse = await sendNotification(server, notificationService, id, notification, { _checkForErrors: checkForErrors });

      expect(notificationService.getActionForId).toHaveBeenCalledTimes(1);
      expect(notificationService.getActionForId).toHaveBeenCalledWith(id);
      expect(checkForErrors).toHaveBeenCalledTimes(1);
      expect(checkForErrors).toHaveBeenCalledWith(action, id, notification);

      expect(sendResponse).toEqual(boomify(error));
    });

  });

});
