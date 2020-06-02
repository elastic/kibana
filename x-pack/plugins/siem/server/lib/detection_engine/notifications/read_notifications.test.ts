/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readNotifications } from './read_notifications';
import { alertsClientMock } from '../../../../../alerts/server/mocks';
import {
  getNotificationResult,
  getFindNotificationsResultWithSingleHit,
} from '../routes/__mocks__/request_responses';

class TestError extends Error {
  constructor() {
    super();

    this.name = 'CustomError';
    this.output = { statusCode: 404 };
  }
  public output: { statusCode: number };
}

describe('read_notifications', () => {
  let alertsClient: ReturnType<typeof alertsClientMock.create>;

  beforeEach(() => {
    alertsClient = alertsClientMock.create();
  });

  describe('readNotifications', () => {
    test('should return the output from alertsClient if id is set but ruleAlertId is undefined', async () => {
      alertsClient.get.mockResolvedValue(getNotificationResult());

      const rule = await readNotifications({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleAlertId: undefined,
      });
      expect(rule).toEqual(getNotificationResult());
    });
    test('should return null if saved object found by alerts client given id is not alert type', async () => {
      const result = getNotificationResult();
      delete result.alertTypeId;
      alertsClient.get.mockResolvedValue(result);

      const rule = await readNotifications({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleAlertId: undefined,
      });
      expect(rule).toEqual(null);
    });

    test('should return error if alerts client throws 404 error on get', async () => {
      alertsClient.get.mockImplementation(() => {
        throw new TestError();
      });

      const rule = await readNotifications({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleAlertId: undefined,
      });
      expect(rule).toEqual(null);
    });

    test('should return error if alerts client throws error on get', async () => {
      alertsClient.get.mockImplementation(() => {
        throw new Error('Test error');
      });
      try {
        await readNotifications({
          alertsClient,
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          ruleAlertId: undefined,
        });
      } catch (exc) {
        expect(exc.message).toEqual('Test error');
      }
    });

    test('should return the output from alertsClient if id is set but ruleAlertId is null', async () => {
      alertsClient.get.mockResolvedValue(getNotificationResult());

      const rule = await readNotifications({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleAlertId: null,
      });
      expect(rule).toEqual(getNotificationResult());
    });

    test('should return the output from alertsClient if id is undefined but ruleAlertId is set', async () => {
      alertsClient.get.mockResolvedValue(getNotificationResult());
      alertsClient.find.mockResolvedValue(getFindNotificationsResultWithSingleHit());

      const rule = await readNotifications({
        alertsClient,
        id: undefined,
        ruleAlertId: 'rule-1',
      });
      expect(rule).toEqual(getNotificationResult());
    });

    test('should return null if the output from alertsClient with ruleAlertId set is empty', async () => {
      alertsClient.get.mockResolvedValue(getNotificationResult());
      alertsClient.find.mockResolvedValue({ data: [], page: 0, perPage: 1, total: 0 });

      const rule = await readNotifications({
        alertsClient,
        id: undefined,
        ruleAlertId: 'rule-1',
      });
      expect(rule).toEqual(null);
    });

    test('should return the output from alertsClient if id is null but ruleAlertId is set', async () => {
      alertsClient.get.mockResolvedValue(getNotificationResult());
      alertsClient.find.mockResolvedValue(getFindNotificationsResultWithSingleHit());

      const rule = await readNotifications({
        alertsClient,
        id: null,
        ruleAlertId: 'rule-1',
      });
      expect(rule).toEqual(getNotificationResult());
    });

    test('should return null if id and ruleAlertId are null', async () => {
      alertsClient.get.mockResolvedValue(getNotificationResult());
      alertsClient.find.mockResolvedValue(getFindNotificationsResultWithSingleHit());

      const rule = await readNotifications({
        alertsClient,
        id: null,
        ruleAlertId: null,
      });
      expect(rule).toEqual(null);
    });

    test('should return null if id and ruleAlertId are undefined', async () => {
      alertsClient.get.mockResolvedValue(getNotificationResult());
      alertsClient.find.mockResolvedValue(getFindNotificationsResultWithSingleHit());

      const rule = await readNotifications({
        alertsClient,
        id: undefined,
        ruleAlertId: undefined,
      });
      expect(rule).toEqual(null);
    });
  });
});
