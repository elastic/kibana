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
  nonRuleFindResult,
  typicalMlRulePayload,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { updateRulesRoute } from './update_rules_route';
import { getUpdateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { createRuleDataClientMock } from '../../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';
import { IRuleDataClient } from '../../../../../../rule_registry/server';
import { SecuritySolutionRequestHandlerContext } from '../../../../types';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());
jest.mock('../../rules/update_rules_notifications');

describe('update_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;
  let ruleDataClientMock = createRuleDataClientMock();

  const mockRulesClient = (ruleDataClient: IRuleDataClient | undefined) => {
    clients.rulesClient.get.mockResolvedValue(
      getAlertMock(getQueryRuleParams(ruleDataClient != null))
    ); // existing rule
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(ruleDataClient != null)); // rule exists
    clients.rulesClient.update.mockResolvedValue(
      getAlertMock(getQueryRuleParams(ruleDataClient != null))
    ); // successful update
  };

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();

    clients.ruleExecutionLogClient.find.mockResolvedValue([]); // successful transform: ;
    ruleDataClientMock = createRuleDataClientMock();
  });

  describe('status codes with actionClient and alertClient', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 200 when updating a single rule with a valid actionClient and alertClient - %s',
      async (_, ruleDataClient) => {
        updateRulesRoute(server.router, ml, ruleDataClient);
        mockRulesClient(ruleDataClient);
        (updateRulesNotifications as jest.Mock).mockResolvedValue({
          id: 'id',
          actions: [],
          alertThrottle: null,
          ruleThrottle: 'no_actions',
        });
        const response = await server.inject(getUpdateRequest(ruleDataClient != null), context);
        expect(response.status).toEqual(200);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 404 when updating a single rule that does not exist - %s',
      async (_, ruleDataClient) => {
        updateRulesRoute(server.router, ml, ruleDataClient);
        mockRulesClient(ruleDataClient);
        clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
        const response = await server.inject(getUpdateRequest(ruleDataClient != null), context);

        expect(response.status).toEqual(404);
        expect(response.body).toEqual({
          message: 'rule_id: "rule-1" not found',
          status_code: 404,
        });
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 404 if alertClient is not available on the route - %s',
      async (_, ruleDataClient) => {
        updateRulesRoute(server.router, ml, ruleDataClient);
        mockRulesClient(ruleDataClient);
        context.alerting!.getRulesClient = jest.fn();
        const response = await server.inject(getUpdateRequest(ruleDataClient != null), context);

        expect(response.status).toEqual(404);
        expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns 404 if siem client is unavailable - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(
        getUpdateRequest(ruleDataClient != null),
        (contextWithoutSecuritySolution as unknown) as SecuritySolutionRequestHandlerContext
      );
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns error when updating non-rule - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      clients.rulesClient.find.mockResolvedValue(nonRuleFindResult(ruleDataClient != null));
      const response = await server.inject(getUpdateRequest(ruleDataClient != null), context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('catches error if search throws error - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getUpdateRequest(ruleDataClient != null), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns a 403 if mlAuthz fails - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: typicalMlRulePayload(ruleDataClient != null),
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
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('rejects payloads with no ID - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      const noIdRequest = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getUpdateRulesSchemaMock(undefined, ruleDataClient != null),
          id: undefined,
        },
      });
      const response = await server.inject(noIdRequest, context);
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows query rule type - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getUpdateRulesSchemaMock(undefined, ruleDataClient != null), type: 'query' },
      });
      const result = await server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('rejects unknown rule type - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getUpdateRulesSchemaMock(undefined, ruleDataClient != null),
          type: 'unknown type',
        },
      });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows rule type of query and custom from and interval - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-7m',
          interval: '5m',
          ...getUpdateRulesSchemaMock(undefined, ruleDataClient != null),
          type: 'query',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('disallows invalid "from" param on rule - %s', async (_, ruleDataClient) => {
      updateRulesRoute(server.router, ml, ruleDataClient);
      mockRulesClient(ruleDataClient);
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getUpdateRulesSchemaMock(undefined, ruleDataClient != null),
          type: 'query',
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
});
