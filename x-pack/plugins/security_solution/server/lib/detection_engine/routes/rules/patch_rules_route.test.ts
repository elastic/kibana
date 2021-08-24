/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  getEmptyFindResult,
  getRuleExecutionStatuses,
  getAlertMock,
  getPatchRequest,
  getFindResultWithSingleHit,
  nonRuleFindResult,
  typicalMlRulePayload,
  getEmptySavedObjectsResponse,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { patchRulesRoute } from './patch_rules_route';
import { getPatchRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/patch_rules_schema.mock';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { IRuleDataClient } from '../../../../../../rule_registry/server';
import { createRuleDataClientMock } from '../../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

const createMocks = (ruleDataClient: IRuleDataClient) => {
  const ml = mlServicesMock.createSetupContract();
  const server = serverMock.create();
  const { clients, context } = requestContextMock.createTools();
  clients.rulesClient.get.mockResolvedValue(
    getAlertMock(getQueryRuleParams(ruleDataClient != null))
  ); // existing rule
  clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(ruleDataClient != null)); // existing rule
  clients.rulesClient.update.mockResolvedValue(
    getAlertMock(getQueryRuleParams(ruleDataClient != null))
  ); // successful update
  clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse()); // successful transform
  clients.savedObjectsClient.create.mockResolvedValue(getRuleExecutionStatuses()[0]); // successful transform
  clients.ruleExecutionLogClient.find.mockResolvedValue(getRuleExecutionStatuses());

  patchRulesRoute(server.router, ml, ruleDataClient);
  return { clients, context, ml, server };
};

describe('patch_rules', () => {
  let ruleDataClientMock = createRuleDataClientMock();

  beforeEach(() => {
    ruleDataClientMock = createRuleDataClientMock();
  });

  describe('status codes with actionClient and alertClient', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 200 when updating a single rule with a valid actionClient and alertClient - %s',
      async (_, ruleDataClient) => {
        const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
        const response = await server.inject(getPatchRequest(), context);
        expect(response.status).toEqual(200);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 404 when updating a single rule that does not exist - %s',
      async (_, ruleDataClient) => {
        const { clients, context, server } = createMocks(ruleDataClient as IRuleDataClient);
        clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
        const response = await server.inject(getPatchRequest(), context);
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
        const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
        context.alerting!.getRulesClient = jest.fn();
        const response = await server.inject(getPatchRequest(), context);
        expect(response.status).toEqual(404);
        expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns error if requesting a non-rule - %s', async (_, ruleDataClient) => {
      const { clients, context, server } = createMocks(ruleDataClient as IRuleDataClient);
      clients.rulesClient.find.mockResolvedValue(nonRuleFindResult(ruleDataClient != null));
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: expect.stringContaining('not found'),
        status_code: 404,
      });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('catches error if update throws error - %s', async (_, ruleDataClient) => {
      const { clients, context, server } = createMocks(ruleDataClient as IRuleDataClient);
      clients.rulesClient.update.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows ML Params to be patched - %s', async (_, ruleDataClient) => {
      const { clients, context, server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          type: 'machine_learning',
          rule_id: 'my-rule-id',
          anomaly_threshold: 4,
          machine_learning_job_id: 'some_job_id',
        },
      });
      await server.inject(request, context);

      expect(clients.rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({
              anomalyThreshold: 4,
              machineLearningJobId: ['some_job_id'],
            }),
          }),
        })
      );
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('rejects patching a rule to ML if mlAuthz fails - %s', async (_, ruleDataClient) => {
      const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest.fn().mockResolvedValue({
          valid: ruleDataClient != null,
          message: 'mocked validation message',
        }),
      });
      const request = requestMock.create({
        method: 'patch',
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

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('rejects patching an ML rule if mlAuthz fails - %s', async (_, ruleDataClient) => {
      const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest.fn().mockResolvedValue({
          valid: ruleDataClient != null,
          message: 'mocked validation message',
        }),
      });
      const { type, ...payloadWithoutType } = typicalMlRulePayload(ruleDataClient != null);
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: payloadWithoutType,
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
      const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getPatchRulesSchemaMock(), rule_id: undefined },
      });
      const response = await server.inject(request, context);
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows query rule type - %s', async (_, ruleDataClient) => {
      const { server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getPatchRulesSchemaMock(), type: 'query' },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('rejects unknown rule type - %s', async (_, ruleDataClient) => {
      const { server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getPatchRulesSchemaMock(), type: 'unknown_type' },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "unknown_type" supplied to "type"'
      );
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows rule type of query and custom from and interval - %s', async (_, ruleDataClient) => {
      const { server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { from: 'now-7m', interval: '5m', ...getPatchRulesSchemaMock() },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('disallows invalid "from" param on rule - %s', async (_, ruleDataClient) => {
      const { server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getPatchRulesSchemaMock(),
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
});
