/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from '../../../../../alerts/server/mocks';
import { deleteNotifications } from './delete_notifications';
import { readNotifications } from './read_notifications';
jest.mock('./read_notifications');

describe('deleteNotifications', () => {
  let alertsClient: ReturnType<typeof alertsClientMock.create>;
  const notificationId = 'notification-52128c15-0d1b-4716-a4c5-46997ac7f3bd';
  const ruleAlertId = 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd';

  beforeEach(() => {
    alertsClient = alertsClientMock.create();
  });

  it('should return null if notification was not found', async () => {
    (readNotifications as jest.Mock).mockResolvedValue(null);

    const result = await deleteNotifications({
      alertsClient,
      id: notificationId,
      ruleAlertId,
    });

    expect(result).toBe(null);
  });

  it('should call alertsClient.delete if notification was found', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: notificationId,
    });

    const result = await deleteNotifications({
      alertsClient,
      id: notificationId,
      ruleAlertId,
    });

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual({ id: notificationId });
  });

  it('should call alertsClient.delete if notification.id was null', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: null,
    });

    const result = await deleteNotifications({
      alertsClient,
      id: notificationId,
      ruleAlertId,
    });

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual({ id: null });
  });

  it('should return null if alertsClient.delete rejects with 404 if notification.id was null', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: null,
    });

    alertsClient.delete.mockRejectedValue({
      output: {
        statusCode: 404,
      },
    });

    const result = await deleteNotifications({
      alertsClient,
      id: notificationId,
      ruleAlertId,
    });

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual(null);
  });

  it('should return error object if alertsClient.delete rejects with status different than 404 and if notification.id was null', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: null,
    });

    const errorObject = {
      output: {
        statusCode: 500,
      },
    };

    alertsClient.delete.mockRejectedValue(errorObject);

    let errorResult;
    try {
      await deleteNotifications({
        alertsClient,
        id: notificationId,
        ruleAlertId,
      });
    } catch (error) {
      errorResult = error;
    }

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(errorResult).toEqual(errorObject);
  });

  it('should return null if notification.id and id were null', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: null,
    });

    const result = await deleteNotifications({
      alertsClient,
      id: undefined,
      ruleAlertId,
    });

    expect(result).toEqual(null);
  });
});
