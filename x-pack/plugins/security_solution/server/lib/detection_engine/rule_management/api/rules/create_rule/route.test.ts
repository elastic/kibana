/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import {
  getEmptyFindResult,
  getRuleMock,
  getCreateRequest,
  getFindResultWithSingleHit,
  createMlRuleRequest,
  getBasicEmptySearchResponse,
} from '../../../../routes/__mocks__/request_responses';
import {
  mlServicesMock,
  mlAuthzMock as mockMlAuthzFactory,
} from '../../../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { requestContextMock, serverMock, requestMock } from '../../../../routes/__mocks__';
import { createRuleRoute } from './route';
import { getCreateRulesSchemaMock } from '../../../../../../../common/detection_engine/rule_schema/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';

jest.mock('../../../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe('Create rule route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult()); // no current rules
    clients.rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams())); // creation succeeds

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    createRuleRoute(server.router, ml);
  });

  describe('status codes', () => {
    test('returns 200 with a rule created via RulesClient', async () => {
      const response = await server.inject(
        getCreateRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 200 if license is not platinum', async () => {
      (context.licensing.license.hasAtLeast as jest.Mock).mockReturnValue(false);

      const response = await server.inject(
        getCreateRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });
  });

  describe('creating an ML Rule', () => {
    test('is successful', async () => {
      const response = await server.inject(
        createMlRuleRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns a 403 if ML Authz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });

      const response = await server.inject(
        createMlRuleRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('unhappy paths', () => {
    test('returns a duplicate error if rule_id already exists', async () => {
      clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const response = await server.inject(
        getCreateRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(409);
      expect(response.body).toEqual({
        message: expect.stringContaining('already exists'),
        status_code: 409,
      });
    });

    test('catches error if creation throws', async () => {
      clients.rulesClient.create.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getCreateRequest(),
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
    test('allows rule type of query', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          type: 'query',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          type: 'unexpected_type',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: { from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock() },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getCreateRulesSchemaMock(),
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
});
