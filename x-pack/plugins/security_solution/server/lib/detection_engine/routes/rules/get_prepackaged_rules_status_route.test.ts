/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrepackagedRulesStatusRoute } from './get_prepackaged_rules_status_route';

import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getPrepackagedRulesStatusRequest,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, createMockConfig } from '../__mocks__';
import { SecurityPluginSetup } from '../../../../../../security/server';
import { checkTimelinesStatus } from '../../../timeline/utils/check_timelines_status';
import {
  mockCheckTimelinesStatusBeforeInstallResult,
  mockCheckTimelinesStatusAfterInstallResult,
} from '../../../timeline/__mocks__/import_timelines';

jest.mock('../../rules/get_prepackaged_rules', () => {
  return {
    getLatestPrepackagedRules: async () => {
      return [
        {
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          version: 2, // set one higher than the mocks which is set to 1 to trigger updates
        },
      ];
    },
  };
});

jest.mock('../../../timeline/utils/check_timelines_status', () => {
  const actual = jest.requireActual('../../../timeline/utils/check_timelines_status');
  return {
    ...actual,
    checkTimelinesStatus: jest.fn(),
  };
});

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('get_prepackaged_rule_status_route - %s', (_, isRuleRegistryEnabled) => {
  const mockGetCurrentUser = {
    user: {
      username: 'mockUser',
    },
  };

  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let securitySetup: SecurityPluginSetup;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());

    (checkTimelinesStatus as jest.Mock).mockResolvedValue({
      timelinesToInstall: [],
      timelinesToUpdate: [],
      prepackagedTimelines: [],
    });

    getPrepackagedRulesStatusRoute(
      server.router,
      createMockConfig(),
      securitySetup,
      isRuleRegistryEnabled
    );
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getPrepackagedRulesStatusRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catch error when finding rules throws error', async () => {
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getPrepackagedRulesStatusRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('responses', () => {
    test('0 rules installed, 0 custom rules, 1 rules not installed, and 1 rule not updated', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const request = getPrepackagedRulesStatusRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_custom_installed: 0,
        rules_installed: 0,
        rules_not_installed: 1,
        rules_not_updated: 0,
        timelines_installed: 0,
        timelines_not_installed: 0,
        timelines_not_updated: 0,
      });
    });

    test('1 rule installed, 1 custom rules, 0 rules not installed, and 1 rule to not updated', async () => {
      clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled));
      const request = getPrepackagedRulesStatusRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_custom_installed: 1,
        rules_installed: 1,
        rules_not_installed: 0,
        rules_not_updated: 1,
        timelines_installed: 0,
        timelines_not_installed: 0,
        timelines_not_updated: 0,
      });
    });

    test('0 timelines installed, 3 timelines not installed, 0 timelines not updated', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      (checkTimelinesStatus as jest.Mock).mockResolvedValue(
        mockCheckTimelinesStatusBeforeInstallResult
      );
      const request = getPrepackagedRulesStatusRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_custom_installed: 0,
        rules_installed: 0,
        rules_not_installed: 1,
        rules_not_updated: 0,
        timelines_installed: 0,
        timelines_not_installed: 3,
        timelines_not_updated: 0,
      });
    });

    test('3 timelines installed, 0 timelines not installed, 0 timelines not updated', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      (checkTimelinesStatus as jest.Mock).mockResolvedValue(
        mockCheckTimelinesStatusAfterInstallResult
      );
      const request = getPrepackagedRulesStatusRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_custom_installed: 0,
        rules_installed: 0,
        rules_not_installed: 1,
        rules_not_updated: 0,
        timelines_installed: 3,
        timelines_not_installed: 0,
        timelines_not_updated: 0,
      });
    });
  });
});
