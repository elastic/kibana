/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  typicalPayload,
  getReadBulkRequest,
  getEmptyIndex,
  getNonEmptyIndex,
  getFindResultWithSingleHit,
  getEmptyFindResult,
  getResult,
  createBulkMlRuleRequest,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { createRulesBulkRoute } from './create_rules_bulk_route';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../feature_flags';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe('create_rules_bulk', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.create>;

  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.create();

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex()); // index exists
    clients.alertsClient.find.mockResolvedValue(getEmptyFindResult()); // no existing rules
    clients.alertsClient.create.mockResolvedValue(getResult()); // successful creation

    createRulesBulkRoute(server.router, ml);
  });

  describe('status codes', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getReadBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(getReadBulkRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    it('returns 404 if siem client is unavailable', async () => {
      const { siem, ...contextWithoutSiem } = context;
      const response = await server.inject(getReadBulkRequest(), contextWithoutSiem);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });
  });

  describe('unhappy paths', () => {
    it('returns a 403 error object if ML Authz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });

      const response = await server.inject(createBulkMlRuleRequest(), context);
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

    it('returns an error object if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      const response = await server.inject(getReadBulkRequest(), context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: {
            message:
              'To create a rule, the index must exist first. Index .siem-signals does not exist',
            status_code: 400,
          },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('returns a duplicate error if rule_id already exists', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const response = await server.inject(getReadBulkRequest(), context);

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
      clients.alertsClient.create.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getReadBulkRequest(), context);

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

    it('returns an error object if duplicate rule_ids found in request payload', async () => {
      const request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
        body: [typicalPayload(), typicalPayload()],
      });
      const response = await server.inject(request, context);

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
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
        body: [{ ...typicalPayload(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
        body: [{ ...typicalPayload(), type: 'unexpected_type' }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        '"value" at position 0 fails because [child "type" fails because ["type" must be one of [query, saved_query, machine_learning]]]'
      );
    });
  });
});
