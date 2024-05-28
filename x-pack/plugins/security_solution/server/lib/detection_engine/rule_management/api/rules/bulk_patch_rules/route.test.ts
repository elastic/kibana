/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_ENGINE_RULES_BULK_UPDATE,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../../../../common/constants';
import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getPatchBulkRequest,
  getRuleMock,
  typicalMlRulePayload,
} from '../../../../routes/__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../../../../routes/__mocks__';
import { bulkPatchRulesRoute } from './route';
import { getCreateRulesSchemaMock } from '../../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getMlRuleParams, getQueryRuleParams } from '../../../../rule_schema/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { HttpAuthzError } from '../../../../../machine_learning/validation';

describe('Bulk patch rules route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    const logger = loggingSystemMock.createLogger();

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams())); // update succeeds
    clients.rulesManagementClient.patchRule.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    bulkPatchRulesRoute(server.router, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getPatchBulkRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns an error in the response when updating a single rule that does not exist', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(
        getPatchBulkRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('allows ML Params to be patched', async () => {
      const anomalyThreshold = 4;
      const machineLearningJobId = 'some_job_id';

      clients.rulesClient.get.mockResolvedValueOnce(getRuleMock(getMlRuleParams()));
      clients.rulesClient.find.mockResolvedValueOnce({
        ...getFindResultWithSingleHit(),
        data: [getRuleMock(getMlRuleParams())],
      });
      clients.rulesManagementClient.patchRule.mockResolvedValueOnce(
        getRuleMock(
          getMlRuleParams({
            anomalyThreshold,
            machineLearningJobId: [machineLearningJobId],
          })
        )
      );

      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/bulk_update`,
        body: [
          {
            type: 'machine_learning',
            rule_id: 'my-rule-id',
            anomaly_threshold: anomalyThreshold,
            machine_learning_job_id: machineLearningJobId,
          },
        ],
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body[0].machine_learning_job_id).toEqual([machineLearningJobId]);
      expect(response.body[0].anomaly_threshold).toEqual(anomalyThreshold);
    });

    it('rejects patching a rule to ML if mlAuthz fails', async () => {
      clients.rulesManagementClient.patchRule.mockImplementationOnce(async () => {
        throw new HttpAuthzError('mocked validation message');
      });

      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [typicalMlRulePayload()],
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

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
      clients.rulesManagementClient.patchRule.mockImplementationOnce(async () => {
        throw new HttpAuthzError('mocked validation message');
      });
      const { type, ...payloadWithoutType } = typicalMlRulePayload();
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [payloadWithoutType],
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

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
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [{ ...getCreateRulesSchemaMock(), rule_id: undefined }],
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

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
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [{ ...getCreateRulesSchemaMock(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [{ ...getCreateRulesSchemaMock(), type: 'unknown_type' }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        '0.type: Invalid literal value, expected "eql", 0.language: Invalid literal value, expected "eql", 0.type: Invalid literal value, expected "query", 0.type: Invalid literal value, expected "saved_query", 0.type: Invalid literal value, expected "threshold", and 5 more'
      );
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [{ from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock() }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [
          {
            from: 'now-3755555555555555.67s',
            interval: '5m',
            ...getCreateRulesSchemaMock(),
          },
        ],
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        '0.from: Failed to parse date-math expression'
      );
    });
  });
});
