/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  getEmptyFindResult,
  getBulkActionRequest,
  getFindResultWithSingleHit,
  getFindResultWithMultiHits,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { performBulkActionRoute } from './perform_bulk_action_route';
import { getPerformBulkActionSchemaMock } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema.mock';
import { loggingSystemMock } from 'src/core/server/mocks';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('perform_bulk_action - %s', (_, isRuleRegistryEnabled) => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const mockRule = getFindResultWithSingleHit(isRuleRegistryEnabled).data[0];

  beforeEach(() => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled));

    performBulkActionRoute(server.router, ml, logger, isRuleRegistryEnabled);
  });

  describe('status codes', () => {
    it('returns 200 when performing bulk action with all dependencies present', async () => {
      const response = await server.inject(getBulkActionRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ success: true, rules_count: 1 });
    });

    it("returns 200 when provided filter query doesn't match any rules", async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getBulkActionRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ success: true, rules_count: 0 });
    });

    it('returns 400 when provided filter query matches too many rules', async () => {
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({ data: [], total: Infinity })
      );
      const response = await server.inject(getBulkActionRequest(), context);
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: 'More than 10000 rules matched the filter query. Try to narrow it down.',
        status_code: 400,
      });
    });

    it('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getRulesClient = jest.fn();
      const response = await server.inject(getBulkActionRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });
  });

  describe('request validation', () => {
    it('rejects payloads with no action', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: { ...getPerformBulkActionSchemaMock(), action: undefined },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "undefined" supplied to "action",Invalid value "undefined" supplied to "updates"'
      );
    });

    it('rejects payloads with unknown action', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: { ...getPerformBulkActionSchemaMock(), action: 'unknown' },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "unknown" supplied to "action",Invalid value "undefined" supplied to "updates"'
      );
    });

    it('accepts payloads with no query', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: { ...getPerformBulkActionSchemaMock(), query: undefined },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('accepts payloads with query and action', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });

  describe('failures', () => {
    it('catches failures if disable throws error', async () => {
      clients.rulesClient.disable.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getBulkActionRequest(), context);
      expect(response.status).toEqual(200);

      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: 'Test error',
              statusCode: 500,
              rule: {
                id: mockRule.id,
                name: mockRule.name,
              },
            },
          },
        ],
        failed_rules_count: 1,
        rules_count: 1,
        success: false,
      });
    });

    it('catches failures when patching rule if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const response = await server.inject(getBulkActionRequest(), context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: 'mocked validation message',
              statusCode: 403,
              rule: {
                id: mockRule.id,
                name: mockRule.name,
              },
            },
          },
        ],
        failed_rules_count: 1,
        rules_count: 1,
        success: false,
      });
    });
    it('process the rest of rules updates if one of updates fails', async () => {
      const failedRuleId = 'fail-rule-id';
      const failedRuleName = 'Rule that fails';
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: [{ ...mockRule, id: failedRuleId, name: failedRuleName }, mockRule, mockRule],
          total: 3,
        })
      );

      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockImplementationOnce(() => ({ valid: false, message: 'mocked validation message' }))
          .mockImplementationOnce(() => ({ valid: true }))
          .mockImplementationOnce(() => ({ valid: true })),
      });
      const response = await server.inject(getBulkActionRequest(), context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: 'mocked validation message',
              rule: {
                id: failedRuleId,
                name: failedRuleName,
              },
              statusCode: 403,
            },
          },
        ],
        failed_rules_count: 1,
        rules_count: 3,
        success: false,
      });
    });
  });

  it('should process large number of rules, larger than request chunk', async () => {
    const rulesNumber = 3_000;
    clients.rulesClient.find.mockResolvedValue(
      getFindResultWithMultiHits({
        data: Array.from({ length: rulesNumber }).map(() => mockRule),
        total: rulesNumber,
      })
    );

    const response = await server.inject(getBulkActionRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ success: true, rules_count: rulesNumber });
  });
});
