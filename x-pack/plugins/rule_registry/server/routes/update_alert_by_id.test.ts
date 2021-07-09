/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { updateAlertByIdRoute } from './update_alert_by_id';
import { requestContextMock } from './__mocks__/request_context';
import { getUpdateRequest } from './__mocks__/request_responses';
import { requestMock, serverMock } from './__mocks__/server';

describe('updateAlertByIdRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.update.mockResolvedValue({
      _index: '.alerts-observability-apm',
      _id: 'NoxgpHkBqbdrfX07MqXV',
      _version: 'WzM2MiwyXQ==',
      result: 'updated',
      _shards: { total: 2, successful: 1, failed: 0 },
      _seq_no: 1,
      _primary_term: 1,
    });

    updateAlertByIdRoute(server.router);
  });

  test('returns 200 when updating a single alert with valid params', async () => {
    const response = await server.inject(getUpdateRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      _index: '.alerts-observability-apm',
      _id: 'NoxgpHkBqbdrfX07MqXV',
      _version: 'WzM2MiwyXQ==',
      result: 'updated',
      _shards: { total: 2, successful: 1, failed: 0 },
      _seq_no: 1,
      _primary_term: 1,
      success: true,
    });
  });

  describe('request validation', () => {
    test('rejects invalid query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'patch',
            path: BASE_RAC_ALERTS_API_PATH,
            body: {
              status: 'closed',
              ids: 'alert-1',
              index: '.alerts-observability-apm*',
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"alert-1\\" supplied to \\"ids\\"'"`
      );
    });

    test('rejects unknown query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'patch',
            path: BASE_RAC_ALERTS_API_PATH,
            body: {
              notStatus: 'closed',
              ids: ['alert-1'],
              index: '.alerts-observability-apm*',
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"undefined\\" supplied to \\"status\\"'"`
      );
    });
  });

  test('returns error status if rac client "GET" fails', async () => {
    clients.rac.update.mockRejectedValue(new Error('Unable to update alert'));
    const response = await server.inject(getUpdateRequest(), context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      attributes: { success: false },
      message: 'Unable to update alert',
    });
  });
});
