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
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { searchAlertByUuid } from './alert_status_route';
import { mockAlerts } from '../../common/mocks/constants/session_view_process.mock';

import {
  AlertsClient,
  ConstructorOptions,
} from '../../../rule_registry/server/alert_data_client/alerts_client';
import { loggingSystemMock } from 'src/core/server/mocks';
import { alertingAuthorizationMock } from '../../../alerting/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '../../../security/server/audit/mocks';
import { AlertingAuthorizationEntity } from '../../../alerting/server';
import { ruleDataServiceMock } from '../../../rule_registry/server/rule_data_plugin_service/rule_data_plugin_service.mock';

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
      total: 1,
      hits: [
        {
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
            ...mockAlerts[0],
          },
        },
      ],
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

describe('alert_status_route.ts', () => {
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

    // @ts-expect-error
    alertsClientParams.ruleDataService.findIndicesByFeature.mockImplementation(() => [
      'alerts-security.alerts',
    ]);
  });

  describe('searchAlertByUuid(client, alertUuid)', () => {
    it('should return an empty events array for a non existant alert uuid', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());
      const alertsClient = new AlertsClient({ ...alertsClientParams, esClient });
      const body = await searchAlertByUuid(alertsClient, mockAlerts[0].kibana!.alert!.uuid!);

      expect(body.events.length).toBe(0);
    });

    it('returns results for a particular alert uuid', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getResponse());
      const alertsClient = new AlertsClient({ ...alertsClientParams, esClient });
      const body = await searchAlertByUuid(alertsClient, mockAlerts[0].kibana!.alert!.uuid!);

      expect(body.events.length).toBe(1);
    });
  });
});
