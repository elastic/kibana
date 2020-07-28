/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPrepackagedRulesStatusRoute } from './get_prepackaged_rules_status_route';

import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getPrepackagedRulesStatusRequest,
  getNonEmptyIndex,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, createMockConfig } from '../__mocks__';
import { SecurityPluginSetup } from '../../../../../../security/server';

jest.mock('../../rules/get_prepackaged_rules', () => {
  return {
    getPrepackagedRules: () => {
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

describe('get_prepackaged_rule_status_route', () => {
  const mockGetCurrentUser = {
    user: {
      username: 'mockUser',
    },
  };

  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let securitySetup: SecurityPluginSetup;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    securitySetup = ({
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown) as SecurityPluginSetup;

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());
    clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());

    getPrepackagedRulesStatusRoute(server.router, createMockConfig(), securitySetup);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getPrepackagedRulesStatusRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(getPrepackagedRulesStatusRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test('catch error when finding rules throws error', async () => {
      clients.alertsClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getPrepackagedRulesStatusRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('responses', () => {
    test('0 rules installed, 0 custom rules, 1 rules not installed, and 1 rule not updated', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const request = getPrepackagedRulesStatusRequest();
      const response = await server.inject(request, context);

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
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const request = getPrepackagedRulesStatusRequest();
      const response = await server.inject(request, context);

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
  });
});
