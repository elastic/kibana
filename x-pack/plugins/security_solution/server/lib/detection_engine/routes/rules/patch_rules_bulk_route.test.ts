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
  getResult,
  typicalMlRulePayload,
} from '../__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../__mocks__';
import { patchRulesBulkRoute } from './patch_rules_bulk_route';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe('patch_rules_bulk', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.create();

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.alertsClient.update.mockResolvedValue(getResult()); // update succeeds

    patchRulesBulkRoute(server.router, ml);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns an error in the response when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('allows ML Params to be patched', async () => {
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

      expect(clients.alertsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({
              anomalyThreshold: 4,
              machineLearningJobId: 'some_job_id',
            }),
          }),
        })
      );
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    it('rejects patching a rule to ML if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [typicalMlRulePayload()],
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

    it('rejects patching an existing ML rule if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const { type, ...payloadWithoutType } = typicalMlRulePayload();
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
    test('rejects payloads with no ID', async () => {
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

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...getCreateRulesSchemaMock(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
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

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock() }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
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
