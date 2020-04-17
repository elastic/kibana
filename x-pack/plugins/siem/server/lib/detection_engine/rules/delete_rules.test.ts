/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsClientMock } from '../../../../../actions/server/mocks';
import { alertsClientMock } from '../../../../../alerting/server/mocks';
import { deleteRules } from './delete_rules';
import { readRules } from './read_rules';
jest.mock('./read_rules');

describe('deleteRules', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let alertsClient: ReturnType<typeof alertsClientMock.create>;
  const notificationId = 'notification-52128c15-0d1b-4716-a4c5-46997ac7f3bd';
  const ruleId = 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd';

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    alertsClient = alertsClientMock.create();
  });

  it('should return null if notification was not found', async () => {
    (readRules as jest.Mock).mockResolvedValue(null);

    const result = await deleteRules({
      alertsClient,
      actionsClient,
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
      actionsClient,
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

  it('should call alertsClient.delete if ruleId was null', async () => {
    (readRules as jest.Mock).mockResolvedValue({
      id: null,
    });

    const result = await deleteRules({
      alertsClient,
      actionsClient,
      id: notificationId,
      ruleId: null,
    });

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual({ id: null });
  });

  it('should return null if alertsClient.delete rejects with 404 if ruleId was null', async () => {
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
      actionsClient,
      id: notificationId,
      ruleId: null,
    });

    expect(alertsClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notificationId,
      })
    );
    expect(result).toEqual(null);
  });

  it('should return error object if alertsClient.delete rejects with status different than 404 and if ruleId was null', async () => {
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
        actionsClient,
        id: notificationId,
        ruleId: null,
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

  it('should return null if ruleId and id was null', async () => {
    (readRules as jest.Mock).mockResolvedValue({
      id: null,
    });

    const result = await deleteRules({
      alertsClient,
      actionsClient,
      id: undefined,
      ruleId: null,
    });

    expect(result).toEqual(null);
  });
});
