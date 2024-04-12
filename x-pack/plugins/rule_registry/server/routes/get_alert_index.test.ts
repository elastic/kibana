/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { getAlertsIndexRoute } from './get_alert_index';
import { requestContextMock } from './__mocks__/request_context';
import { getReadIndexRequest } from './__mocks__/request_responses';
import { requestMock, serverMock } from './__mocks__/server';

describe('getAlertsIndexRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.getAuthorizedAlertsIndicesByFeatureIds.mockResolvedValue([
      'alerts-security.alerts',
    ]);

    getAlertsIndexRoute(server.router);
  });

  test('returns 200 when querying for index', async () => {
    const response = await server.inject(getReadIndexRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ index_name: ['alerts-security.alerts'] });
  });

  describe('request validation', () => {
    test('rejects invalid query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'get',
            path: `${BASE_RAC_ALERTS_API_PATH}/index`,
            query: { features: 4 },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"4\\" supplied to \\"features\\"'"`
      );
    });

    test('rejects unknown query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'get',
            path: `${BASE_RAC_ALERTS_API_PATH}/index`,
            query: { boop: 'siem' },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'invalid keys \\"boop\\"'"`
      );
    });
  });

  test('returns error status if rac client "getAuthorizedAlertsIndices" fails', async () => {
    clients.rac.getAuthorizedAlertsIndicesByFeatureIds.mockRejectedValue(
      new Error('Unable to get index')
    );
    const response = await server.inject(getReadIndexRequest(), context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      attributes: { success: false },
      message: 'Unable to get index',
    });
  });
});
