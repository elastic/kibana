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
  getAlertMock,
  getFindResultWithSingleHit,
  getUpdateBulkRequest,
  typicalMlRulePayload,
} from '../__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../__mocks__';
import { updateRulesBulkRoute } from './update_rules_bulk_route';
import { BulkError } from '../utils';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { createRuleDataClientMock } from '../../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';
import { IRuleDataClient } from '../../../../../../rule_registry/server';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

const createMocks = (ruleDataClient: IRuleDataClient) => {
  const ml = mlServicesMock.createSetupContract();
  const server = serverMock.create();
  const { clients, context } = requestContextMock.createTools();
  clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(ruleDataClient != null));
  clients.rulesClient.update.mockResolvedValue(
    getAlertMock(getQueryRuleParams(ruleDataClient != null))
  );
  updateRulesBulkRoute(server.router, ml, ruleDataClient);
  return { clients, context, ml, server };
};

describe('update_rules_bulk', () => {
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
        const response = await server.inject(getUpdateBulkRequest(), context);
        expect(response.status).toEqual(200);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns 200 as a response when updating a single rule that does not exist - %s',
      async (_, ruleDataClient) => {
        const { clients, context, server } = createMocks(ruleDataClient as IRuleDataClient);
        clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
        const expected: BulkError[] = [
          {
            error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
            rule_id: 'rule-1',
          },
        ];
        const response = await server.inject(getUpdateBulkRequest(), context);

        expect(response.status).toEqual(200);
        expect(response.body).toEqual(expected);
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
        const response = await server.inject(getUpdateBulkRequest(), context);
        expect(response.status).toEqual(404);
        expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns 404 if siem client is unavailable - %s', async (_, ruleDataClient) => {
      const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      // @ts-expect-error
      const response = await server.inject(getUpdateBulkRequest(), contextWithoutSecuritySolution);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns an error if update throws - %s', async (_, ruleDataClient) => {
      const { clients, context, server } = createMocks(ruleDataClient as IRuleDataClient);
      clients.rulesClient.update.mockImplementation(() => {
        throw new Error('Test error');
      });

      const expected: BulkError[] = [
        {
          error: { message: 'Test error', status_code: 500 },
          rule_id: 'rule-1',
        },
      ];
      const response = await server.inject(getUpdateBulkRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expected);
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('returns a 403 error object if mlAuthz fails - %s', async (_, ruleDataClient) => {
      const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [typicalMlRulePayload(ruleDataClient != null)],
      });

      const response = await server.inject(request, context);
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
  });

  describe('request validation', () => {
    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('rejects payloads with no ID - %s', async (_, ruleDataClient) => {
      const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
      const noIdRequest = requestMock.create({
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...getCreateRulesSchemaMock(), rule_id: undefined }],
      });
      const response = await server.inject(noIdRequest, context);
      expect(response.body).toEqual([
        {
          error: { message: 'either "id" or "rule_id" must be set', status_code: 400 },
          rule_id: '(unknown id)',
        },
      ]);
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows query rule type - %s', async (_, ruleDataClient) => {
      const { server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...getCreateRulesSchemaMock(), type: 'query' }],
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
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...getCreateRulesSchemaMock(), type: 'unknown_type' }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows rule type of query and custom from and interval - %s', async (_, ruleDataClient) => {
      const { server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock(), type: 'query' }],
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
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [
          {
            from: 'now-3755555555555555.67s',
            interval: '5m',
            ...getCreateRulesSchemaMock(),
            type: 'query',
          },
        ],
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
});
