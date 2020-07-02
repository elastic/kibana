/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from '../../../../../alerts/server/mocks';
import { deleteRules } from './delete_rules';
import { readRules } from './read_rules';
jest.mock('./read_rules');

describe('deleteRules', () => {
  let alertsClient: ReturnType<typeof alertsClientMock.create>;
  const notificationId = 'notification-52128c15-0d1b-4716-a4c5-46997ac7f3bd';
  const ruleId = 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd';

  beforeEach(() => {
    alertsClient = alertsClientMock.create();
  });

  it('should return null if notification was not found', async () => {
    (readRules as jest.Mock).mockResolvedValue(null);

    const result = await deleteRules({
      alertsClient,
      id: notificationId,
      ruleId,
    });

    expect(result).toBe(null);
  });

  it('should call alertsClient.delete if notification was found', async () => {
    (readRules as jest.Mock).mockResolvedValue({
      id: notificationId,
    });

    const result = await deleteRules({
      alertsClient,
      id: notificationId,
      ruleId,
    });

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual({ id: notificationId });
  });

  it('should call alertsClient.delete if ruleId was undefined', async () => {
    (readRules as jest.Mock).mockResolvedValue({
      id: null,
    });

    const result = await deleteRules({
      alertsClient,
      id: notificationId,
      ruleId: undefined,
    });

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual({ id: null });
  });

  it('should return null if alertsClient.delete rejects with 404 if ruleId was undefined', async () => {
    (readRules as jest.Mock).mockResolvedValue({
      id: null,
    });

    alertsClient.delete.mockRejectedValue({
      output: {
        statusCode: 404,
      },
    });

    const result = await deleteRules({
      alertsClient,
      id: notificationId,
      ruleId: undefined,
    });

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual(null);
  });

  it('should return error object if alertsClient.delete rejects with status different than 404 and if ruleId was undefined', async () => {
    (readRules as jest.Mock).mockResolvedValue({
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
      await deleteRules({
        alertsClient,
        id: notificationId,
        ruleId: undefined,
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

  it('should return null if ruleId and id was undefined', async () => {
    (readRules as jest.Mock).mockResolvedValue({
      id: null,
    });

    const result = await deleteRules({
      alertsClient,
      id: undefined,
      ruleId: undefined,
    });

    expect(result).toEqual(null);
  });
});
