/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_BULK_UPDATE } from '../../../../../../../common/constants';
import { mlServicesMock } from '../../../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import {
  getEmptyFindResult,
  getRuleMock,
  getFindResultWithSingleHit,
  getUpdateBulkRequest,
  typicalMlRulePayload,
} from '../../../../routes/__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../../../../routes/__mocks__';
import { bulkUpdateRulesRoute } from './route';
import type { BulkError } from '../../../../routes/utils';
import { getCreateRulesSchemaMock } from '../../../../../../../common/detection_engine/rule_schema/mocks';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
// eslint-disable-next-line no-restricted-imports
import { legacyMigrate } from '../../../logic/rule_actions/legacy_action_migration';

jest.mock('../../../../../machine_learning/authz');

jest.mock('../../../logic/rule_actions/legacy_action_migration', () => {
  const actual = jest.requireActual('../../../logic/rule_actions/legacy_action_migration');
  return {
    ...actual,
    legacyMigrate: jest.fn(),
  };
});

describe('Bulk update rules route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();
    const logger = loggingSystemMock.createLogger();

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    clients.appClient.getSignalsIndex.mockReturnValue('.siem-signals-test-index');

    (legacyMigrate as jest.Mock).mockResolvedValue(getRuleMock(getQueryRuleParams()));

    bulkUpdateRulesRoute(server.router, ml, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getUpdateBulkRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 200 as a response when updating a single rule that does not exist', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      (legacyMigrate as jest.Mock).mockResolvedValue(null);

      const expected: BulkError[] = [
        {
          error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
          rule_id: 'rule-1',
        },
      ];
      const response = await server.inject(
        getUpdateBulkRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expected);
    });

    test('returns an error if update throws', async () => {
      clients.rulesClient.update.mockImplementation(() => {
        throw new Error('Test error');
      });

      const expected: BulkError[] = [
        {
          error: { message: 'Test error', status_code: 500 },
          rule_id: 'rule-1',
        },
      ];
      const response = await server.inject(
        getUpdateBulkRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expected);
    });

    it('returns a 403 error object if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'put',
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
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      (legacyMigrate as jest.Mock).mockResolvedValue(null);

      const noIdRequest = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [{ ...getCreateRulesSchemaMock(), rule_id: undefined }],
      });
      const response = await server.inject(noIdRequest, requestContextMock.convertContext(context));
      expect(response.body).toEqual([
        {
          error: { message: 'either "id" or "rule_id" must be set', status_code: 400 },
          rule_id: '(unknown id)',
        },
      ]);
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [{ ...getCreateRulesSchemaMock(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [{ ...getCreateRulesSchemaMock(), type: 'unknown_type' }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
        body: [{ from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_BULK_UPDATE,
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
