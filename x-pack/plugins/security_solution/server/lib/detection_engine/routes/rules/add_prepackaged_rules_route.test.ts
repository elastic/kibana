/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEmptyFindResult,
  addPrepackagedRulesRequest,
  getFindResultWithSingleHit,
  getAlertMock,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, createMockConfig, mockGetCurrentUser } from '../__mocks__';
import { AddPrepackagedRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { SecurityPluginSetup } from '../../../../../../security/server';
import { addPrepackedRulesRoute, createPrepackagedRules } from './add_prepackaged_rules_route';
import { listMock } from '../../../../../../lists/server/mocks';
import { siemMock } from '../../../../mocks';
import { FrameworkRequest } from '../../../framework';
import { ExceptionListClient } from '../../../../../../lists/server';
import { installPrepackagedTimelines } from '../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';

jest.mock('../../rules/get_prepackaged_rules', () => {
  return {
    getLatestPrepackagedRules: async (): Promise<AddPrepackagedRulesSchemaDecoded[]> => {
      return [
        {
          author: ['Elastic'],
          tags: [],
          rule_id: 'rule-1',
          risk_score: 50,
          risk_score_mapping: [],
          severity_mapping: [],
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          query: 'user.name: root or user.name: admin',
          language: 'kuery',
          references: [],
          actions: [],
          enabled: false,
          false_positives: [],
          max_signals: 100,
          threat: [],
          throttle: null,
          exceptions_list: [],
          version: 2, // set one higher than the mocks which is set to 1 to trigger updates
        },
      ];
    },
  };
});

jest.mock('../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines', () => {
  return {
    installPrepackagedTimelines: jest.fn().mockResolvedValue({
      success: true,
      success_count: 3,
      errors: [],
      timelines_installed: 3,
      timelines_updated: 0,
    }),
  };
});

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('add_prepackaged_rules_route - %s', (_, isRuleRegistryEnabled) => {
  const siemMockClient = siemMock.createClient();
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let securitySetup: SecurityPluginSetup;
  let mockExceptionsClient: ExceptionListClient;
  const testif = isRuleRegistryEnabled ? test.skip : test;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    mockExceptionsClient = listMock.getExceptionListClient();

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled));
    clients.rulesClient.update.mockResolvedValue(
      getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())
    );

    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: true,
      success_count: 0,
      timelines_installed: 3,
      timelines_updated: 0,
      errors: [],
    });

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({ _shards: { total: 1 } })
    );
    addPrepackedRulesRoute(server.router, createMockConfig(), securitySetup, isRuleRegistryEnabled);
  });

  describe('status codes', () => {
    test('returns 200 when creating with a valid actionClient and rulesClient', async () => {
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
    });

    test('returns 404 if rulesClient is not available on the route', async () => {
      context.alerting!.getRulesClient = jest.fn();
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'Not Found',
        status_code: 404,
      });
    });

    test('it returns a 400 if the index does not exist when rule registry not enabled', async () => {
      const request = addPrepackagedRulesRequest();
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({ _shards: { total: 0 } })
      );
      const response = await server.inject(request, context);

      expect(response.status).toEqual(isRuleRegistryEnabled ? 200 : 400);
      if (!isRuleRegistryEnabled) {
        expect(response.body).toEqual({
          status_code: 400,
          message: expect.stringContaining(
            'Pre-packaged rules cannot be installed until the signals index is created'
          ),
        });
      }
    });

    test('returns 404 if siem client is unavailable', async () => {
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(
        addPrepackagedRulesRequest(),
        // @ts-expect-error
        contextWithoutSecuritySolution
      );
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });
  });

  describe('responses', () => {
    test('1 rule is installed and 0 are updated when find results are empty', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_installed: 1,
        rules_updated: 0,
        timelines_installed: 3,
        timelines_updated: 0,
      });
    });

    test('1 rule is updated and 0 are installed when we return a single find and the versions are different', async () => {
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_installed: 0,
        rules_updated: 1,
        timelines_installed: 3,
        timelines_updated: 0,
      });
    });

    testif(
      'catches errors if signals index does not exist when rule registry not enabled',
      async () => {
        context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
          elasticsearchClientMock.createErrorTransportRequestPromise(new Error('Test error'))
        );
        const request = addPrepackagedRulesRequest();
        const response = await server.inject(request, context);

        expect(response.status).toEqual(500);
        expect(response.body).toEqual({ message: 'Test error', status_code: 500 });
      }
    );
  });

  test('should install prepackaged timelines', async () => {
    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: false,
      success_count: 0,
      timelines_installed: 0,
      timelines_updated: 0,
      errors: [
        {
          id: '36429040-b529-11ea-8d8b-21de98be11a6',
          error: {
            message: 'timeline_id: "36429040-b529-11ea-8d8b-21de98be11a6" already exists',
            status_code: 409,
          },
        },
      ],
    });
    const request = addPrepackagedRulesRequest();
    const response = await server.inject(request, context);
    expect(response.body).toEqual({
      rules_installed: 0,
      rules_updated: 1,
      timelines_installed: 0,
      timelines_updated: 0,
    });
  });

  test('should include the result of installing prepackaged timelines - timelines_installed', async () => {
    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: true,
      success_count: 1,
      timelines_installed: 1,
      timelines_updated: 0,
      errors: [],
    });
    const request = addPrepackagedRulesRequest();
    const response = await server.inject(request, context);
    expect(response.body).toEqual({
      rules_installed: 0,
      rules_updated: 1,
      timelines_installed: 1,
      timelines_updated: 0,
    });
  });

  test('should include the result of installing prepackaged timelines - timelines_updated', async () => {
    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: true,
      success_count: 1,
      timelines_installed: 0,
      timelines_updated: 1,
      errors: [],
    });
    const request = addPrepackagedRulesRequest();
    const response = await server.inject(request, context);
    expect(response.body).toEqual({
      rules_installed: 0,
      rules_updated: 1,
      timelines_installed: 0,
      timelines_updated: 1,
    });
  });

  test('should include the result of installing prepackaged timelines - skip the error message', async () => {
    (installPrepackagedTimelines as jest.Mock).mockReset();
    (installPrepackagedTimelines as jest.Mock).mockResolvedValue({
      success: false,
      success_count: 0,
      timelines_installed: 0,
      timelines_updated: 0,
      errors: [
        {
          id: '36429040-b529-11ea-8d8b-21de98be11a6',
          error: {
            message: 'timeline_id: "36429040-b529-11ea-8d8b-21de98be11a6" already exists',
            status_code: 409,
          },
        },
      ],
    });
    const request = addPrepackagedRulesRequest();
    const response = await server.inject(request, context);
    expect(response.body).toEqual({
      rules_installed: 0,
      rules_updated: 1,
      timelines_installed: 0,
      timelines_updated: 0,
    });
  });

  describe('createPrepackagedRules', () => {
    test('uses exception lists client from context when available', async () => {
      context.lists = {
        getExceptionListClient: jest.fn(),
        getListClient: jest.fn(),
      };
      const config = createMockConfig();

      await createPrepackagedRules(
        context,
        siemMockClient,
        clients.rulesClient,
        {} as FrameworkRequest,
        1200,
        config.prebuiltRulesFromFileSystem,
        config.prebuiltRulesFromSavedObjects,
        mockExceptionsClient
      );

      expect(mockExceptionsClient.createEndpointList).not.toHaveBeenCalled();
      expect(context.lists?.getExceptionListClient).toHaveBeenCalled();
    });

    test('uses passed in exceptions list client when lists client not available in context', async () => {
      const { lists, ...myContext } = context;
      const config = createMockConfig();

      await createPrepackagedRules(
        myContext,
        siemMockClient,
        clients.rulesClient,
        {} as FrameworkRequest,
        1200,
        config.prebuiltRulesFromFileSystem,
        config.prebuiltRulesFromSavedObjects,
        mockExceptionsClient
      );

      expect(mockExceptionsClient.createEndpointList).toHaveBeenCalled();
    });
  });
});
