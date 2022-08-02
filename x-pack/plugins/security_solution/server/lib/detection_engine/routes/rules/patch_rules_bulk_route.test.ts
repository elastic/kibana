/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_ENGINE_RULES_BULK_UPDATE,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../../common/constants';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getPatchBulkRequest,
  getRuleMock,
  typicalMlRulePayload,
} from '../__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../__mocks__';
import { patchRulesBulkRoute } from './patch_rules_bulk_route';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getMlRuleParams, getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { legacyMigrate } from '../../rules/utils';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

jest.mock('../../rules/utils', () => {
  const actual = jest.requireActual('../../rules/utils');
  return {
    ...actual,
    legacyMigrate: jest.fn(),
  };
});

describe('patch_rules_bulk', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();
    const logger = loggingSystemMock.createLogger();

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams())); // update succeeds

    (legacyMigrate as jest.Mock).mockResolvedValue(getRuleMock(getQueryRuleParams()));

    patchRulesBulkRoute(server.router, ml, logger);
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
      (legacyMigrate as jest.Mock).mockResolvedValue(null);
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
      clients.rulesClient.get.mockResolvedValueOnce(getRuleMock(getMlRuleParams()));
      clients.rulesClient.find.mockResolvedValueOnce({
        ...getFindResultWithSingleHit(),
        data: [getRuleMock(getMlRuleParams())],
      });
      (legacyMigrate as jest.Mock).mockResolvedValueOnce(getRuleMock(getMlRuleParams()));
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
      await server.inject(request, requestContextMock.convertContext(context));

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

    it('rejects patching a rule to ML if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
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
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
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
      (legacyMigrate as jest.Mock).mockResolvedValue(null);

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
        'Invalid value "unknown_type" supplied to "type",Invalid value "kuery" supplied to "language"'
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
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
});
