/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  getEmptyFindResult,
  getAlertMock,
  getUpdateRequest,
  getFindResultWithSingleHit,
  getRuleExecutionSummarySucceeded,
  nonRuleFindResult,
  typicalMlRulePayload,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { updateRulesRoute } from './update_rules_route';
import { getUpdateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { legacyMigrate } from '../../rules/utils';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

jest.mock('../../rules/utils', () => {
  const actual = jest.requireActual('../../rules/utils');
  return {
    ...actual,
    legacyMigrate: jest.fn(),
  };
});

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('update_rules - %s', (_, isRuleRegistryEnabled) => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();

    clients.rulesClient.get.mockResolvedValue(
      getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())
    ); // existing rule
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled)); // rule exists
    clients.rulesClient.update.mockResolvedValue(
      getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())
    ); // successful update
    clients.ruleExecutionLog.getExecutionSummary.mockResolvedValue(
      getRuleExecutionSummarySucceeded()
    );
    clients.appClient.getSignalsIndex.mockReturnValue('.siem-signals-test-index');

    (legacyMigrate as jest.Mock).mockResolvedValue(
      getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())
    );

    updateRulesRoute(server.router, ml, isRuleRegistryEnabled);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(getUpdateRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      (legacyMigrate as jest.Mock).mockResolvedValue(null);
      const response = await server.inject(getUpdateRequest(), context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('returns error when updating non-rule', async () => {
      clients.rulesClient.find.mockResolvedValue(nonRuleFindResult(isRuleRegistryEnabled));
      (legacyMigrate as jest.Mock).mockResolvedValue(null);
      const response = await server.inject(getUpdateRequest(), context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getUpdateRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    it('returns a 403 if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: typicalMlRulePayload(),
      });

      const response = await server.inject(request, context);
      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const noIdRequest = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getUpdateRulesSchemaMock(),
          id: undefined,
        },
      });
      const response = await server.inject(noIdRequest, context);
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getUpdateRulesSchemaMock(), type: 'query' },
      });
      const result = await server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getUpdateRulesSchemaMock(), type: 'unknown type' },
      });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { from: 'now-7m', interval: '5m', ...getUpdateRulesSchemaMock(), type: 'query' },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getUpdateRulesSchemaMock(),
          type: 'query',
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
});
