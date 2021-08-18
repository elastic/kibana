/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { deleteNotifications } from './delete_notifications';
import { readNotifications } from './read_notifications';
jest.mock('./read_notifications');

describe('deleteNotifications', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  const notificationId = 'notification-52128c15-0d1b-4716-a4c5-46997ac7f3bd';
  const ruleAlertId = 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd';

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  it('should return null if notification was not found', async () => {
    (readNotifications as jest.Mock).mockResolvedValue(null);

    const result = await deleteNotifications({
      rulesClient,
      id: notificationId,
      ruleAlertId,
    });

    expect(result).toBe(null);
  });

  it('should call rulesClient.delete if notification was found', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: notificationId,
    });

    const result = await deleteNotifications({
      rulesClient,
      id: notificationId,
      ruleAlertId,
    });

    expect(rulesClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual({ id: notificationId });
  });

  it('should call rulesClient.delete if notification.id was null', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: null,
    });

    const result = await deleteNotifications({
      rulesClient,
      id: notificationId,
      ruleAlertId,
    });

    expect(rulesClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual({ id: null });
  });

  it('should return null if rulesClient.delete rejects with 404 if notification.id was null', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: null,
    });

    rulesClient.delete.mockRejectedValue({
      output: {
        statusCode: 404,
      },
    });

    const result = await deleteNotifications({
      rulesClient,
      id: notificationId,
      ruleAlertId,
    });

    expect(rulesClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual(null);
  });

  it('should return error object if rulesClient.delete rejects with status different than 404 and if notification.id was null', async () => {
    (readNotifications as jest.Mock).mockResolvedValue({
      id: null,
    });

    const errorObject = {
      output: {
        statusCode: 500,
      },
    };

    rulesClient.delete.mockRejectedValue(errorObject);

    let errorResult;
    try {
      await deleteNotifications({
        rulesClient,
        id: notificationId,
        ruleAlertId,
      });
    } catch (error) {
      errorResult = error;
    }

    expect(rulesClient.delete).toHaveBeenCalledWith(
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
      rulesClient,
      id: undefined,
      ruleAlertId,
    });

    expect(result).toEqual(null);
  });
});
