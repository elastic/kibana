/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { DETECTION_ENGINE_RULES_URL_FIND } from '../../../../../common/constants';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { requestContextMock, requestMock, serverMock } from '../__mocks__';
import {
  getRuleMock,
  getFindRequest,
  getFindResultWithSingleHit,
  getEmptySavedObjectsResponse,
} from '../__mocks__/request_responses';
import { findRulesRoute } from './find_rules_route';

describe('find_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.rulesClient.get.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse());

    findRulesRoute(server.router, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getFindRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catches error if search throws error', async () => {
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getFindRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows optional query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'timestamp',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          invalid_value: 'hi mom',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith('invalid keys "invalid_value"');
    });
  });
});
