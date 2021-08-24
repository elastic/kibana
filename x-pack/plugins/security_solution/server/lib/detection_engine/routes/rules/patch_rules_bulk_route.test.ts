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
  getFindResultWithSingleHit,
  getPatchBulkRequest,
  getAlertMock,
  typicalMlRulePayload,
} from '../__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../__mocks__';
import { patchRulesBulkRoute } from './patch_rules_bulk_route';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { IRuleDataClient } from '../../../../../../rule_registry/server';
import { createRuleDataClientMock } from '../../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

const createMocks = (ruleDataClient: IRuleDataClient) => {
  const ml = mlServicesMock.createSetupContract();
  const server = serverMock.create();
  const { clients, context } = requestContextMock.createTools();
  clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(ruleDataClient != null));
  clients.rulesClient.update.mockResolvedValue(
    getAlertMock(getQueryRuleParams(ruleDataClient != null))
  );
  patchRulesBulkRoute(server.router, ml, ruleDataClient);
  return { clients, context, ml, server };
};

describe('patch_rules_bulk', () => {
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
        const response = await server.inject(getPatchBulkRequest(), context);
        expect(response.status).toEqual(200);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])(
      'returns an error in the response when updating a single rule that does not exist - %s',
      async (_, ruleDataClient) => {
        const { clients, context, server } = createMocks(ruleDataClient as IRuleDataClient);
        clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
        const response = await server.inject(getPatchBulkRequest(), context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual([
          {
            error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
            rule_id: 'rule-1',
          },
        ]);
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('allows ML Params to be patched - %s', async (_, ruleDataClient) => {
      const { clients, context, server } = createMocks(ruleDataClient as IRuleDataClient);
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/bulk_update`,
        body: [
          {
            type: 'machine_learning',
            rule_id: 'my-rule-id',
            anomaly_threshold: 4,
            machine_learning_job_id: 'some_job_id',
          },
        ],
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
    ])(
      'returns 404 if alertClient is not available on the route - %s',
      async (_, ruleDataClient) => {
        const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
        context.alerting!.getRulesClient = jest.fn();
        const response = await server.inject(getPatchBulkRequest(), context);
        expect(response.status).toEqual(404);
        expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
      }
    );

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('rejects patching a rule to ML if mlAuthz fails - %s', async (_, ruleDataClient) => {
      const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'patch',
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

    test.each([
      ['Legacy', undefined],
      ['RAC', ruleDataClientMock],
    ])('rejects patching an existing ML rule if mlAuthz fails - %s', async (_, ruleDataClient) => {
      const { context, server } = createMocks(ruleDataClient as IRuleDataClient);
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const { type, ...payloadWithoutType } = typicalMlRulePayload(ruleDataClient != null);
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [payloadWithoutType],
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
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...getCreateRulesSchemaMock(), rule_id: undefined }],
      });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: {
            message: 'id or rule_id should have been defined',
            status_code: 404,
          },
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
        method: 'patch',
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
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...getCreateRulesSchemaMock(), type: 'unknown_type' }],
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
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock() }],
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
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
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
