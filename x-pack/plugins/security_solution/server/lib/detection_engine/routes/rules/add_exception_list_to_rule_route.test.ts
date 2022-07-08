/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

import { buildHapiStream } from '../__mocks__/utils';
import {
  getImportRulesRequest,
  getImportRulesRequestOverwriteTrue,
  getRuleMock,
  getFindResultWithSingleHit,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { createRuleExceptionListRoute } from './add_exception_list_to_rule_route';
import * as createRulesAndExceptionsStreamFromNdJson from '../../rules/create_rules_stream_from_ndjson';
import { ruleIdsToNdJsonString } from '../../../../../common/detection_engine/schemas/request/import_rules_schema.mock';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import { getDetectionsExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { getCreateExceptionListDetectionSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe('createRuleExceptionListRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    request = requestMock.create({
      method: 'post',
      path: `${DETECTION_ENGINE_RULES_URL}/exceptions`,
      body: {
        rule_so_id: '1234',
        rule_id: 'my_rule',
        list: getCreateExceptionListDetectionSchemaMock(),
      },
    });

    clients.rulesClient.get.mockResolvedValue(getRuleMock(getQueryRuleParams())); // existing rule
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // existing rule
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams())); // successful update
    clients.lists.exceptionListClient.getExceptionList = jest
      .fn()
      .mockResolvedValue(getDetectionsExceptionListSchemaMock());
    clients.lists.exceptionListClient.createExceptionList = jest
      .fn()
      .mockResolvedValue(getDetectionsExceptionListSchemaMock());
    // context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
    //   elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    // );
    createRuleExceptionListRoute(server.router);
  });

  describe('happy paths', () => {
    test('returns 200 when adding a default rule exception list', async () => {
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
      expect(response.body).toEqual();
    });

    test('returns 200 when adding an endpoint list', async () => {
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });
  });

  xdescribe('unhappy paths', () => {
    test('returns a 403 error object if ML Authz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: 'mocked validation message',
              status_code: 403,
            },
            rule_id: 'rule-1',
          },
        ],
        success: false,
        success_count: 0,
        rules_count: 1,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
      });
    });

    test('returns error if createRulesAndExceptionsStreamFromNdJson throws error', async () => {
      const transformMock = jest
        .spyOn(createRulesAndExceptionsStreamFromNdJson, 'createRulesAndExceptionsStreamFromNdJson')
        .mockImplementation(() => {
          throw new Error('Test error');
        });
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: 'Test error', status_code: 500 });

      transformMock.mockRestore();
    });

    test('returns 400 if file extension type is not .ndjson', async () => {
      const requestPayload = buildHapiStream(ruleIdsToNdJsonString(['rule-1']), 'wrong.html');
      const badRequest = getImportRulesRequest(requestPayload);
      const response = await server.inject(badRequest, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({ message: 'Invalid file extension .html', status_code: 400 });
    });
  });

  xdescribe('single rule import', () => {
    test('returns 200 if rule imported successfully', async () => {
      clients.rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [],
        success: true,
        success_count: 1,
        rules_count: 1,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
      });
    });

    test('returns reported conflict if error parsing rule', async () => {
      const requestPayload = buildHapiStream('this is not a valid ndjson string!');
      const badRequest = getImportRulesRequest(requestPayload);
      const response = await server.inject(badRequest, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: 'Unexpected token h in JSON at position 1',
              status_code: 400,
            },
            rule_id: '(unknown id)',
          },
        ],
        success: false,
        success_count: 0,
        rules_count: 1,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
      });
    });

    describe('rule with existing rule_id', () => {
      test('returns with reported conflict if `overwrite` is set to `false`', async () => {
        clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // extant rule
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [
            {
              error: {
                message: 'rule_id: "rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 0,
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        });
      });

      test('returns with NO reported conflict if `overwrite` is set to `true`', async () => {
        clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // extant rule
        const overwriteRequest = getImportRulesRequestOverwriteTrue(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1']))
        );
        const response = await server.inject(
          overwriteRequest,
          requestContextMock.convertContext(context)
        );

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        });
      });
    });
  });
});
