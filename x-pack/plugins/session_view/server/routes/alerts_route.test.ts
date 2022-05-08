/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  SPACE_IDS,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { doSearch } from './alerts_route';
import { mockEvents } from '../../common/mocks/constants/session_view_process.mock';

import {
  AlertsClient,
  ConstructorOptions,
} from '@kbn/rule-registry-plugin/server/alert_data_client/alerts_client';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { AlertingAuthorizationEntity } from '@kbn/alerting-plugin/server';
import { ruleDataServiceMock } from '@kbn/rule-registry-plugin/server/rule_data_plugin_service/rule_data_plugin_service.mock';

const alertingAuthMock = alertingAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

const DEFAULT_SPACE = 'test_default_space_id';

const getEmptyResponse = async () => {
  return {
    hits: {
      total: 0,
      hits: [],
    },
  };
};

const getResponse = async () => {
  return {
    hits: {
      total: mockEvents.length,
      hits: mockEvents.map((event) => {
        return {
          found: true,
          _type: 'alert',
          _index: '.alerts-security',
          _id: 'NoxgpHkBqbdrfX07MqXV',
          _version: 1,
          _seq_no: 362,
          _primary_term: 2,
          _source: {
            [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
            message: 'hello world 1',
            [ALERT_RULE_CONSUMER]: 'apm',
            [ALERT_WORKFLOW_STATUS]: 'open',
            [SPACE_IDS]: ['test_default_space_id'],
            ...event,
          },
        };
      }),
    },
  };
};

const esClientMock = elasticsearchServiceMock.createElasticsearchClient(getResponse());

const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  logger: loggingSystemMock.create().get(),
  authorization: alertingAuthMock,
  auditLogger,
  ruleDataService: ruleDataServiceMock.create(),
  esClient: esClientMock,
};

describe('alerts_route.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    alertingAuthMock.getSpaceId.mockImplementation(() => DEFAULT_SPACE);
    // @ts-expect-error
    alertingAuthMock.getAuthorizationFilter.mockImplementation(async () =>
      Promise.resolve({ filter: [] })
    );
    // @ts-expect-error
    alertingAuthMock.getAugmentedRuleTypesWithAuthorization.mockImplementation(async () => {
      const authorizedRuleTypes = new Set();
      authorizedRuleTypes.add({ producer: 'apm' });
      return Promise.resolve({ authorizedRuleTypes });
    });

    alertingAuthMock.ensureAuthorized.mockImplementation(
      // @ts-expect-error
      async ({
        ruleTypeId,
        consumer,
        operation,
        entity,
      }: {
        ruleTypeId: string;
        consumer: string;
        operation: string;
        entity: typeof AlertingAuthorizationEntity.Alert;
      }) => {
        if (ruleTypeId === 'apm.error_rate' && consumer === 'apm') {
          return Promise.resolve();
        }
        return Promise.reject(new Error(`Unauthorized for ${ruleTypeId} and ${consumer}`));
      }
    );
  });

  describe('doSearch(client, sessionEntityId)', () => {
    it('should return an empty events array for a non existant entity_id', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());
      const alertsClient = new AlertsClient({ ...alertsClientParams, esClient });
      const body = await doSearch(alertsClient, 'asdf');

      expect(body.events.length).toBe(0);
    });

    it('returns results for a particular session entity_id', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getResponse());
      const alertsClient = new AlertsClient({ ...alertsClientParams, esClient });

      const body = await doSearch(alertsClient, 'asdf');

      expect(body.events.length).toBe(mockEvents.length);
    });
  });
});
