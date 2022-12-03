/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesInfo } from './route';

import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getRulesInfoRequest,
} from '../../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock } from '../../../../routes/__mocks__';

describe('Rule management filters route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());

    getRulesInfo(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getRulesInfoRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catch error when finding rules throws error', async () => {
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getRulesInfoRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('responses', () => {
    test('1 rule installed, 1 custom rule and 3 tags', async () => {
      clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.rulesClient.aggregate.mockResolvedValue({
        alertExecutionStatus: {},
        ruleLastRunOutcome: {},
        ruleTags: ['a', 'b', 'c'],
      });
      const request = getRulesInfoRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_custom_count: 1,
        rules_prebuilt_installed_count: 1,
        tags: ['a', 'b', 'c'],
      });
    });
  });
});
