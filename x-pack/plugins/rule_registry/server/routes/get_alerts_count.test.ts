/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { getAlertsCountRoute } from './get_alerts_count';
import { requestContextMock } from './__mocks__/request_context';
import { requestMock, serverMock } from './__mocks__/server';

describe('getAlertsCountRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.getAlertsCount.mockResolvedValue({
      activeAlertCount: 0,
      recoveredAlertCount: 0,
    });

    getAlertsCountRoute(server.router);
  });

  describe('request validation', () => {
    test('rejects unknown query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_alerts_count`,
            body: {
              featureIds: ['logs'],
              boop: 'unknown',
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'invalid keys \\"boop\\"'"`
      );
    });
  });
});
