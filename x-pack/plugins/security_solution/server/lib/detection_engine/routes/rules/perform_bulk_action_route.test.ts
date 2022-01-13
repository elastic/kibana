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
  getBulkActionEditRequest,
  getFindResultWithSingleHit,
  getFindResultWithMultiHits,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { performBulkActionRoute } from './perform_bulk_action_route';
import { getPerformBulkActionSchemaMock } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema.mock';
import { loggingSystemMock } from 'src/core/server/mocks';
import { isElasticRule } from '../../../../usage/detections';
import { readRules } from '../../rules/read_rules';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());
jest.mock('../../../../usage/detections', () => ({ isElasticRule: jest.fn() }));
jest.mock('../../rules/read_rules', () => ({ readRules: jest.fn() }));

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('perform_bulk_action - %s', (_, isRuleRegistryEnabled) => {
  const isElasticRuleMock = isElasticRule as jest.Mock;
  const readRulesMock = readRules as jest.Mock;
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
    isElasticRuleMock.mockReturnValue(false);
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

  describe('rules execution failures', () => {
    it('returns error if rule is immutable/elastic', async () => {
      isElasticRuleMock.mockReturnValue(true);
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: [mockRule],
          total: 1,
        })
      );

      const response = await server.inject(getBulkActionEditRequest(), context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Bulk edit failed',
        status_code: 500,
        attributes: {
          errors: [
            {
              message: 'Elastic rule can`t be edited',
              status_code: 403,
              rules: [
                {
                  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
                  name: 'Detect Root/Admin Users',
                },
              ],
            },
          ],
          rules: {
            failed: 1,
            succeeded: 0,
            total: 1,
          },
        },
      });
    });

    it('returns error if disable rule throws error', async () => {
      clients.rulesClient.disable.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getBulkActionRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Bulk edit failed',
        status_code: 500,
        attributes: {
          errors: [
            {
              message: 'Test error',
              status_code: 500,
              rules: [
                {
                  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
                  name: 'Detect Root/Admin Users',
                },
              ],
            },
          ],
          rules: {
            failed: 1,
            succeeded: 0,
            total: 1,
          },
        },
      });
    });

    it('returns error if machine learning rule validation fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const response = await server.inject(getBulkActionRequest(), context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: {
          errors: [
            {
              message: 'mocked validation message',
              status_code: 403,
              rules: [
                {
                  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
                  name: 'Detect Root/Admin Users',
                },
              ],
            },
          ],
          rules: {
            failed: 1,
            succeeded: 0,
            total: 1,
          },
        },
        message: 'Bulk edit failed',
        status_code: 500,
      });
    });

    it('returns partial failure error if couple of rule validations fail and the rest are successfull', async () => {
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: [
            { ...mockRule, id: 'failed-rule-id-1' },
            { ...mockRule, id: 'failed-rule-id-2' },
            { ...mockRule, id: 'failed-rule-id-3' },
            mockRule,
            mockRule,
          ],
          total: 5,
        })
      );

      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockImplementationOnce(() => ({ valid: false, message: 'mocked validation message' }))
          .mockImplementationOnce(() => ({ valid: false, message: 'mocked validation message' }))
          .mockImplementationOnce(() => ({ valid: false, message: 'test failure' }))
          .mockImplementationOnce(() => ({ valid: true }))
          .mockImplementationOnce(() => ({ valid: true })),
      });
      const response = await server.inject(getBulkActionEditRequest(), context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: {
          rules: {
            failed: 3,
            succeeded: 2,
            total: 5,
          },
          errors: [
            {
              message: 'mocked validation message',
              status_code: 403,
              rules: [
                {
                  id: 'failed-rule-id-1',
                  name: 'Detect Root/Admin Users',
                },
                {
                  id: 'failed-rule-id-2',
                  name: 'Detect Root/Admin Users',
                },
              ],
            },
            {
              message: 'test failure',
              status_code: 403,
              rules: [
                {
                  id: 'failed-rule-id-3',
                  name: 'Detect Root/Admin Users',
                },
              ],
            },
          ],
        },
        message: 'Bulk edit partially failed',
        status_code: 500,
      });
    });

    it('return error message limited to length of 1000, to prevent large response size', async () => {
      clients.rulesClient.disable.mockImplementation(async () => {
        throw new Error('a'.repeat(1_300));
      });
      const response = await server.inject(getBulkActionRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body.attributes.errors[0].message.length).toEqual(1000);
    });

    it('returns partial failure error if one if rules from ids params can`t be fetched', async () => {
      readRulesMock
        .mockImplementationOnce(() => Promise.resolve(mockRule))
        .mockImplementationOnce(() => Promise.resolve(null));

      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: {
          ...getPerformBulkActionSchemaMock(),
          ids: [mockRule.id, 'failed-mock-id'],
          query: undefined,
        },
      });

      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: {
          rules: {
            failed: 1,
            succeeded: 1,
            total: 2,
          },
          errors: [
            {
              message: 'Can`t fetch a rule',
              status_code: 500,
              rules: [
                {
                  id: 'failed-mock-id',
                },
              ],
            },
          ],
        },
        message: 'Bulk edit partially failed',
        status_code: 500,
      });
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
        'Invalid value "undefined" supplied to "action",Invalid value "undefined" supplied to "edit"'
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
        'Invalid value "unknown" supplied to "action",Invalid value "undefined" supplied to "edit"'
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

    it('rejects payloads with incorrect typing for ids', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: { ...getPerformBulkActionSchemaMock(), ids: 'test fake' },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Invalid value "test fake" supplied to "ids"');
    });

    it('rejects payload if there is more than 100 ids in payload', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: {
          ...getPerformBulkActionSchemaMock(),
          query: undefined,
          ids: Array.from({ length: 101 }).map(() => 'fake-id'),
        },
      });

      const response = await server.inject(request, context);

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual('More than 100 ids sent for bulk edit action.');
    });

    it('rejects payload if both query and ids defined', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_ACTION,
        body: {
          ...getPerformBulkActionSchemaMock(),
          query: '',
          ids: ['fake-id'],
        },
      });

      const response = await server.inject(request, context);

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual(
        'Both query and ids are sent. Define either ids or query in request payload.'
      );
    });
  });

  it('should process large number of rules, larger than configured concurrency', async () => {
    const rulesNumber = 6_000;
    clients.rulesClient.find.mockResolvedValue(
      getFindResultWithMultiHits({
        data: Array.from({ length: rulesNumber }).map(() => mockRule),
        total: rulesNumber,
      })
    );

    const response = await server.inject(getBulkActionEditRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ success: true, rules_count: rulesNumber });
  });
});
