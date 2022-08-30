/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_BULK_CREATE } from '../../../../../common/constants';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  getReadBulkRequest,
  getFindResultWithSingleHit,
  getEmptyFindResult,
  getRuleMock,
  createBulkMlRuleRequest,
  getBasicEmptySearchResponse,
  getBasicNoShardsSearchResponse,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { createRulesBulkRoute } from './create_rules_bulk_route';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe('create_rules_bulk', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();
    const logger = loggingSystemMock.createLogger();

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult()); // no existing rules
    clients.rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams())); // successful creation

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    createRulesBulkRoute(server.router, ml, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getReadBulkRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });
  });

  describe('unhappy paths', () => {
    test('returns a 403 error object if ML Authz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });

      const response = await server.inject(
        createBulkMlRuleRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: {
            message: 'mocked validation message',
            status_code: 403,
          },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('returns an error object if the index does not exist when rule registry not enabled', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          getBasicNoShardsSearchResponse()
        )
      );
      const response = await server.inject(
        getReadBulkRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });

    test('returns a duplicate error if rule_id already exists', async () => {
      clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const response = await server.inject(
        getReadBulkRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          error: {
            message: expect.stringContaining('already exists'),
            status_code: 409,
          },
        }),
      ]);
    });

    test('catches error if creation throws', async () => {
      clients.rulesClient.create.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getReadBulkRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          error: {
            message: 'Test error',
            status_code: 500,
          },
        }),
      ]);
    });

    test('returns an error object if duplicate rule_ids found in request payload', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [getCreateRulesSchemaMock(), getCreateRulesSchemaMock()],
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          error: {
            message: expect.stringContaining('already exists'),
            status_code: 409,
          },
        }),
      ]);
    });
  });

  describe('request validation', () => {
    test('allows rule type of query', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [{ ...getCreateRulesSchemaMock(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [{ from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock() }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [{ ...getCreateRulesSchemaMock(), type: 'unexpected_type' }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [
          {
            from: 'now-3755555555555555.67s',
            interval: '5m',
            ...getCreateRulesSchemaMock(),
          },
        ],
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
});
