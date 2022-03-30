/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildHapiStream } from '../__mocks__/utils';
import {
  getImportRulesRequest,
  getImportRulesRequestOverwriteTrue,
  getEmptyFindResult,
  getAlertMock,
  getFindResultWithSingleHit,
  getBasicEmptySearchResponse,
} from '../__mocks__/request_responses';
import { createMockConfig, requestContextMock, serverMock, requestMock } from '../__mocks__';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { importRulesRoute } from './import_rules_route';
import * as createRulesAndExceptionsStreamFromNdJson from '../../rules/create_rules_stream_from_ndjson';
import {
  getImportRulesWithIdSchemaMock,
  ruleIdsToNdJsonString,
  rulesToNdJsonString,
} from '../../../../../common/detection_engine/schemas/request/import_rules_schema.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe('import_rules_route', () => {
  let config: ReturnType<typeof createMockConfig>;
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    config = createMockConfig();
    const hapiStream = buildHapiStream(ruleIdsToNdJsonString(['rule-1']));
    request = getImportRulesRequest(hapiStream);
    ml = mlServicesMock.createSetupContract();

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult()); // no extant rules
    clients.rulesClient.update.mockResolvedValue(getAlertMock(getQueryRuleParams()));
    clients.actionsClient.getAll.mockResolvedValue([]);
    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    importRulesRoute(server.router, config, ml);
  });

  describe('status codes', () => {
    test('returns 200 when importing a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
    });

    test('returns 500 if more than 10,000 rules are imported', async () => {
      const ruleIds = new Array(10001).fill(undefined).map((__, index) => `rule-${index}`);
      const multiRequest = getImportRulesRequest(buildHapiStream(ruleIdsToNdJsonString(ruleIds)));
      const response = await server.inject(multiRequest, context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: "Can't import more than 10000 rules",
        status_code: 500,
      });
    });
  });

  describe('unhappy paths', () => {
    it('returns a 403 error object if ML Authz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });

      const response = await server.inject(request, context);
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
      const response = await server.inject(request, context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: 'Test error', status_code: 500 });

      transformMock.mockRestore();
    });

    test('returns an error when cluster throws error', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
        elasticsearchClientMock.createErrorTransportRequestPromise({
          body: new Error('Test error'),
        })
      );

      const response = await server.inject(request, context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test('returns 400 if file extension type is not .ndjson', async () => {
      const requestPayload = buildHapiStream(ruleIdsToNdJsonString(['rule-1']), 'wrong.html');
      const badRequest = getImportRulesRequest(requestPayload);
      const response = await server.inject(badRequest, context);

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({ message: 'Invalid file extension .html', status_code: 400 });
    });
  });

  describe('single rule import', () => {
    test('returns 200 if rule imported successfully', async () => {
      clients.rulesClient.create.mockResolvedValue(getAlertMock(getQueryRuleParams()));
      const response = await server.inject(request, context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [],
        success: true,
        success_count: 1,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
      });
    });

    test('returns reported conflict if error parsing rule', async () => {
      const requestPayload = buildHapiStream('this is not a valid ndjson string!');
      const badRequest = getImportRulesRequest(requestPayload);
      const response = await server.inject(badRequest, context);

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
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
      });
    });

    describe('rule with existing rule_id', () => {
      test('returns with reported conflict if `overwrite` is set to `false`', async () => {
        clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // extant rule
        const response = await server.inject(request, context);

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
        const response = await server.inject(overwriteRequest, context);

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [],
          success: true,
          success_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        });
      });
    });
  });

  describe('multi rule import', () => {
    test('returns 200 if all rules imported successfully', async () => {
      const multiRequest = getImportRulesRequest(
        buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-2']))
      );
      const response = await server.inject(multiRequest, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [],
        success: true,
        success_count: 2,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
      });
    });

    test('returns 200 if many rules are imported successfully', async () => {
      const ruleIds = new Array(9999).fill(undefined).map((__, index) => `rule-${index}`);
      const multiRequest = getImportRulesRequest(buildHapiStream(ruleIdsToNdJsonString(ruleIds)));
      const response = await server.inject(multiRequest, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [],
        success: true,
        success_count: 9999,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
      });
    });

    test('returns 200 with errors if all rules are missing rule_ids and import fails on validation', async () => {
      const rulesWithoutRuleIds = ['rule-1', 'rule-2'].map((ruleId) =>
        getImportRulesWithIdSchemaMock(ruleId)
      );
      // @ts-expect-error
      delete rulesWithoutRuleIds[0].rule_id;
      // @ts-expect-error
      delete rulesWithoutRuleIds[1].rule_id;
      const badPayload = buildHapiStream(rulesToNdJsonString(rulesWithoutRuleIds));
      const badRequest = getImportRulesRequest(badPayload);

      const response = await server.inject(badRequest, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: 'Invalid value "undefined" supplied to "rule_id"',
              status_code: 400,
            },
            rule_id: '(unknown id)',
          },
          {
            error: {
              message: 'Invalid value "undefined" supplied to "rule_id"',
              status_code: 400,
            },
            rule_id: '(unknown id)',
          },
        ],
        success: false,
        success_count: 0,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
      });
    });

    describe('importing duplicated rule_ids', () => {
      test('reports a conflict if `overwrite` is set to `false`', async () => {
        const multiRequest = getImportRulesRequest(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-1']))
        );
        const response = await server.inject(multiRequest, context);

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [
            {
              error: {
                message: 'More than one rule with rule-id: "rule-1" found',
                status_code: 400,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        });
      });

      test('returns with NO reported conflict if `overwrite` is set to `true`', async () => {
        const multiRequest = getImportRulesRequestOverwriteTrue(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-1']))
        );

        const response = await server.inject(multiRequest, context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [],
          success: true,
          success_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        });
      });
    });

    describe('rules with existing rule_id', () => {
      beforeEach(() => {
        clients.rulesClient.find.mockResolvedValueOnce(getFindResultWithSingleHit()); // extant rule
      });

      test('returns with reported conflict if `overwrite` is set to `false`', async () => {
        const multiRequest = getImportRulesRequest(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-2', 'rule-3']))
        );
        const response = await server.inject(multiRequest, context);
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
          success_count: 2,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        });
      });

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {
        const multiRequest = getImportRulesRequestOverwriteTrue(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-2', 'rule-3']))
        );
        const response = await server.inject(multiRequest, context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [],
          success: true,
          success_count: 3,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        });
      });
    });
  });
});
