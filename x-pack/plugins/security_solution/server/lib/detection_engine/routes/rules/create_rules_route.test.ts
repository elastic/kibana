/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getEmptyFindResult,
  getAlertMock,
  getCreateRequest,
  getRuleExecutionStatuses,
  getFindResultWithSingleHit,
  createMlRuleRequest,
} from '../__mocks__/request_responses';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { createRulesRoute } from './create_rules_route';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { createRuleDataClientMock } from '../../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';

jest.mock('../../rules/update_rules_notifications');
jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe('create_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;
  let ruleDataClientMock = createRuleDataClientMock();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();
    ruleDataClientMock = createRuleDataClientMock();

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult()); // no current rules
    clients.ruleExecutionLogClient.find.mockResolvedValue(getRuleExecutionStatuses()); // needed to transform: ;

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({ _shards: { total: 1 } })
    );
  });

  describe('status codes with actionClient and alertClient', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'API returns 200 when creating a single rule with a valid actionClient and alertClient - %s',
      async (_, ruleDataClient) => {
        clients.rulesClient.create.mockResolvedValue(
          getAlertMock(getQueryRuleParams(ruleDataClient != null))
        ); // creation succeeds
        console.log('namespace' in getAlertMock(getQueryRuleParams(ruleDataClient != null)).params);
        createRulesRoute(server.router, ml, ruleDataClient);
        (updateRulesNotifications as jest.Mock).mockResolvedValue({
          id: 'id',
          actions: [],
          alertThrottle: null,
          ruleThrottle: 'no_actions',
        });
        const response = await server.inject(getCreateRequest(ruleDataClient != null), context);
        expect(response.status).toEqual(200);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 404 if alertClient is not available on the route - %s',
      async (_, ruleDataClient) => {
        clients.rulesClient.create.mockResolvedValue(
          getAlertMock(getQueryRuleParams(ruleDataClient != null))
        ); // creation succeeds
        createRulesRoute(server.router, ml, ruleDataClient);
        context.alerting!.getRulesClient = jest.fn();
        const response = await server.inject(getCreateRequest(ruleDataClient != null), context);
        expect(response.status).toEqual(404);
        expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns 404 if siem client is unavailable - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(
        getCreateRequest(ruleDataClient != null),
        // @ts-expect-error
        contextWithoutSecuritySolution
      );
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns 200 if license is not platinum - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      (context.licensing.license.hasAtLeast as jest.Mock).mockReturnValue(false);

      const response = await server.inject(getCreateRequest(ruleDataClient != null), context);
      expect(response.status).toEqual(200);
    });
  });

  describe('creating an ML Rule', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('is successful - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      const response = await server.inject(createMlRuleRequest(ruleDataClient != null), context);
      expect(response.status).toEqual(200);
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns a 403 if ML Authz fails - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });

      const response = await server.inject(createMlRuleRequest(ruleDataClient != null), context);
      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('unhappy paths', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'it returns a 400 if the index does not exist (for pre-RAC only)',
      async (_, ruleDataClient) => {
        clients.rulesClient.create.mockResolvedValue(
          getAlertMock(getQueryRuleParams(ruleDataClient != null))
        ); // creation succeeds
        createRulesRoute(server.router, ml);
        context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ _shards: { total: 0 } })
        );
        const response = await server.inject(getCreateRequest(), context);

        expect(response.status).toEqual(400);
        expect(response.body).toEqual({
          message: 'To create a rule, the index must exist first. Index undefined does not exist',
          status_code: 400,
        });
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns a duplicate error if rule_id already exists - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithSingleHit(ruleDataClient != null)
      );
      const response = await server.inject(getCreateRequest(ruleDataClient != null), context);

      expect(response.status).toEqual(409);
      expect(response.body).toEqual({
        message: expect.stringContaining('already exists'),
        status_code: 409,
      });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('catches error if creation throws - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      clients.rulesClient.create.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getCreateRequest(ruleDataClient != null), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows rule type of query - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          ...(ruleDataClient != null ? { namespace: 'default' } : {}),
          type: 'query',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('disallows unknown rule type - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          ...(ruleDataClient != null ? { namespace: 'default' } : {}),
          type: 'unexpected_type',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows rule type of query and custom from an interval - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-7m',
          interval: '5m',
          ...getCreateRulesSchemaMock(),
          ...(ruleDataClient != null ? { namespace: 'default' } : {}),
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('disallows invalid "from" param on rule - %s', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClient);
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getCreateRulesSchemaMock(),
          ...(ruleDataClient != null ? { namespace: 'default' } : {}),
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('disallows namespace when rule_registry is disabled', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml);
      const request = getCreateRequest(true);
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('requires namespace when rule_registry is enabled', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClientMock);
      const request = getCreateRequest();
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('accepts namespace when rule_registry is enabled', async (_, ruleDataClient) => {
      clients.rulesClient.create.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      ); // creation succeeds
      createRulesRoute(server.router, ml, ruleDataClientMock);
      const request = getCreateRequest(true);
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });
});
