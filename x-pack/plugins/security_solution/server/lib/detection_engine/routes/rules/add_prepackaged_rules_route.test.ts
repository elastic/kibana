/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEmptyFindResult,
  addPrepackagedRulesRequest,
  getFindResultWithSingleHit,
  getEmptyIndex,
  getNonEmptyIndex,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock } from '../__mocks__';
import { addPrepackedRulesRoute } from './add_prepackaged_rules_route';
import { AddPrepackagedRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';

jest.mock('../../rules/get_prepackaged_rules', () => {
  return {
    getPrepackagedRules: (): AddPrepackagedRulesSchemaDecoded[] => {
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

describe('add_prepackaged_rules_route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());
    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

    addPrepackedRulesRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200 when creating with a valid actionClient and alertClient', async () => {
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'Not Found',
        status_code: 404,
      });
    });

    test('it returns a 400 if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        status_code: 400,
        message: expect.stringContaining(
          'Pre-packaged rules cannot be installed until the signals index is created'
        ),
      });
    });

    it('returns 404 if siem client is unavailable', async () => {
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(
        addPrepackagedRulesRequest(),
        contextWithoutSecuritySolution
      );
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });
  });

  describe('responses', () => {
    test('1 rule is installed and 0 are updated when find results are empty', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_installed: 1,
        rules_updated: 0,
      });
    });

    test('1 rule is updated and 0 are installed when we return a single find and the versions are different', async () => {
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        rules_installed: 0,
        rules_updated: 1,
      });
    });

    test('catches errors if payloads cause errors to be thrown', async () => {
      clients.clusterClient.callAsCurrentUser.mockImplementation(() => {
        throw new Error('Test error');
      });
      const request = addPrepackagedRulesRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: 'Test error', status_code: 500 });
    });
  });
});
