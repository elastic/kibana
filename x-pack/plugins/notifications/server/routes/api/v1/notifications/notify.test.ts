/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Action, ActionResult, Field, Server } from '../../../../';
import { checkForErrors, sendNotification } from './notify';

const server: Server = {
  log: jest.fn(),
  route: jest.fn(),
  config: jest.fn(),
  plugins: {},
};

class TestAction extends Action {
  private licenseCheck: () => boolean;
  private fieldCheck: (data: any) => Field[];
  private actionFn: (notification: any) => Promise<ActionResult>;

  constructor({
    name,
    licenseCheck = () => true,
    fieldCheck = (data: any) => [],
    performAction = async (notification: any) => new ActionResult({ message: 'test' }),
  }: {
    name: string;
    licenseCheck?: () => boolean;
    fieldCheck?: (data: any) => Field[];
    performAction?: (notification: any) => Promise<ActionResult>;
  }) {
    super({ server, id: '', name });
    this.licenseCheck = licenseCheck;
    this.fieldCheck = fieldCheck;
    this.actionFn = performAction;
  }

  public isLicenseValid(): boolean {
    return this.licenseCheck();
  }

  public getMissingFields(data: any): Field[] {
    return this.fieldCheck(data);
  }

  public async performAction(notification: any): Promise<ActionResult> {
    return this.actionFn(notification);
  }
}

describe('notifications/routes/send', () => {
  describe('checkForErrors', () => {
    it('returns invalid license if license check throws an error', () => {
      const action: TestAction = new TestAction({
        name: 'licenseError',
        licenseCheck: () => {
          throw new Error();
        },
      });
      expect(checkForErrors(action, {})).toEqual({
        message: `Unable to perform '${action.getName()}' action due to the current license.`,
      });
    });

    it('returns invalid license if license is invalid', () => {
      const action: TestAction = new TestAction({
        name: 'licenseError',
        licenseCheck: () => false,
      });

      expect(checkForErrors(action, {})).toEqual({
        message: `Unable to perform '${action.getName()}' action due to the current license.`,
      });
    });

    it('returns fields related to missing data', () => {
      const notification = { fake: true };
      const fields: Field[] = [{ field: 'a', name: 'a', type: 'a' }];
      const action: TestAction = new TestAction({
        name: 'Test Action',
        licenseCheck: () => true,
        fieldCheck: (data: any) => {
          expect(data).toBe(notification);
          return fields;
        },
      });
      const error = checkForErrors(action, notification);

      expect(error).toEqual({
        message: `Unable to perform '${action.getName()}' action due to missing required fields.`,
        fields,
      });
    });

    it('returns null if action is usable', () => {
      const notification = { fake: true };
      const action: TestAction = new TestAction({
        name: 'Test Action',
        licenseCheck: () => true,
        fieldCheck: (data: any) => {
          expect(data).toBe(notification);
          return [];
        },
      });
      expect(checkForErrors(action, notification)).toBeNull();
    });
  });

  describe('sendNotification', () => {
    const id = 'notifications-test';
    const notification = { fake: true };
    it('replies with error object for bad request', async () => {
      const error = {
        message: 'TEST - expected',
        fields: [{ field: 'a', name: 'a', type: 'a' }],
      };
      const action: TestAction = new TestAction({
        name: 'Test Action',
      });

      const NotifServiceMock = jest.fn(() => ({
        setAction: jest.fn(),
        removeAction: jest.fn(),
        getActionForId: jest.fn().mockReturnValue(action),
        getActionsForData: jest.fn(),
      }));
      const notificationService = new NotifServiceMock();

      const errorCheck = jest.fn().mockReturnValue(error);

      const sendResponse: Boom | object = await sendNotification(
        server,
        notificationService,
        id,
        notification,
        {
          _checkForErrors: errorCheck,
        }
      );

      expect(notificationService.getActionForId).toHaveBeenCalledTimes(1);
      expect(notificationService.getActionForId).toHaveBeenCalledWith(id);
      expect(errorCheck).toHaveBeenCalledTimes(1);
      expect(errorCheck).toHaveBeenCalledWith(action, notification);
      expect(server.log).toHaveBeenCalledTimes(1);
      expect(server.log).toHaveBeenCalledWith(['actions', 'error'], error.message);

      expect(sendResponse).toBeInstanceOf(Boom);
      if (sendResponse instanceof Boom) {
        expect(sendResponse.output.payload).toEqual({
          statusCode: 400,
          message: `${error.message}`,
          error: 'Bad Request',
        });
      }
    });

    it('replies with action result JSON', async () => {
      const response = { ok: true, message: 'Test' };
      const result = {
        toJson: () => response,
      };

      const action: TestAction = new TestAction({
        name: 'licenseError',
        performAction: jest.fn().mockReturnValue(Promise.resolve(result)),
      });

      const errorCheck = jest.fn().mockReturnValue(null);

      const NotifServiceMock = jest.fn(() => ({
        setAction: jest.fn(),
        removeAction: jest.fn(),
        getActionForId: jest.fn().mockReturnValue(action),
        getActionsForData: jest.fn(),
      }));
      const notificationService = new NotifServiceMock();

      const sendResponse = await sendNotification(server, notificationService, id, notification, {
        _checkForErrors: errorCheck,
      });

      expect(notificationService.getActionForId).toHaveBeenCalledTimes(1);
      expect(notificationService.getActionForId).toHaveBeenCalledWith(id);
      expect(errorCheck).toHaveBeenCalledTimes(1);
      expect(errorCheck).toHaveBeenCalledWith(action, notification);

      expect(sendResponse).toEqual(response);
    });

    it('replies with unexpected result error', async () => {
      const error = new Error();
      const action: TestAction = new TestAction({
        name: 'licenseError',
        performAction: jest.fn().mockReturnValue(Promise.reject(error)),
      });

      const NotifServiceMock = jest.fn(() => ({
        setAction: jest.fn(),
        removeAction: jest.fn(),
        getActionForId: jest.fn().mockReturnValue(action),
        getActionsForData: jest.fn(),
      }));
      const notificationService = new NotifServiceMock();

      const errorCheck = jest.fn().mockReturnValue(null);

      const sendResponse = await sendNotification(server, notificationService, id, notification, {
        _checkForErrors: errorCheck,
      });

      expect(notificationService.getActionForId).toHaveBeenCalledTimes(1);
      expect(notificationService.getActionForId).toHaveBeenCalledWith(id);
      expect(errorCheck).toHaveBeenCalledTimes(1);
      expect(errorCheck).toHaveBeenCalledWith(action, notification);

      expect(sendResponse).toEqual(Boom.boomify(error));
    });
  });
});
