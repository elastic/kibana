/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { getAlertStateRoute } from './get_alert_state';
import { SavedObjectsErrorHelpers } from 'src/core/server';

const { server, alertsClient } = createMockServer();
server.route(getAlertStateRoute);

const mockedAlertState = {
  alertTypeState: {
    some: 'value',
  },
  alertInstances: {
    first_instance: {
      state: {},
      meta: {
        lastScheduledActions: {
          group: 'first_group',
          date: new Date(),
        },
      },
    },
    second_instance: {},
  },
};

beforeEach(() => jest.resetAllMocks());

test('gets alert state', async () => {
  const request = {
    method: 'GET',
    url: '/api/alert/1/state',
  };

  alertsClient.getAlertState.mockResolvedValueOnce(mockedAlertState);

  const { statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  expect(alertsClient.getAlertState).toHaveBeenCalledWith({ id: '1' });
});

test('returns NO-CONTENT when alert exists but has no task state yet', async () => {
  const request = {
    method: 'GET',
    url: '/api/alert/1/state',
  };

  alertsClient.getAlertState.mockResolvedValueOnce(undefined);

  const { statusCode } = await server.inject(request);
  expect(statusCode).toBe(204);
  expect(alertsClient.getAlertState).toHaveBeenCalledWith({ id: '1' });
});

test('returns NOT-FOUND when alert is not found', async () => {
  const request = {
    method: 'GET',
    url: '/api/alert/1/state',
  };

  alertsClient.getAlertState.mockRejectedValue(
    SavedObjectsErrorHelpers.createGenericNotFoundError('alert', '1')
  );

  const { statusCode } = await server.inject(request);
  expect(statusCode).toBe(404);
  expect(alertsClient.getAlertState).toHaveBeenCalledWith({ id: '1' });
});
