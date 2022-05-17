/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { getFeatureIdsByRegistrationContexts } from './get_feature_ids_by_registration_contexts';
import { requestContextMock } from './__mocks__/request_context';
import { getReadFeatureIdsRequest } from './__mocks__/request_responses';
import { requestMock, serverMock } from './__mocks__/server';

describe('getFeatureIdsByRegistrationContexts', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.getFeatureIdsByRegistrationContexts.mockResolvedValue(['siem']);

    getFeatureIdsByRegistrationContexts(server.router);
  });

  test('returns 200 when querying for features ids', async () => {
    const response = await server.inject(getReadFeatureIdsRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(['siem']);
  });

  describe('request validation', () => {
    test('rejects invalid query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'get',
            path: `${BASE_RAC_ALERTS_API_PATH}/_feature_ids`,
            query: { registrationContext: 4 },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"4\\" supplied to \\"registrationContext\\"'"`
      );
    });

    test('rejects unknown query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'get',
            path: `${BASE_RAC_ALERTS_API_PATH}/_feature_ids`,
            query: { boop: 'siem' },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'invalid keys \\"boop\\"'"`
      );
    });
  });

  test('returns error status if rac client "getFeatureIdsByRegistrationContexts" fails', async () => {
    clients.rac.getFeatureIdsByRegistrationContexts.mockRejectedValue(
      new Error('Unable to get feature ids')
    );
    const response = await server.inject(getReadFeatureIdsRequest(), context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      attributes: { success: false },
      message: 'Unable to get feature ids',
    });
  });
});
