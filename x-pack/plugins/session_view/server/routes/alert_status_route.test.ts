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
import { searchAlertByUuid } from './alert_status_route';
import { mockAlerts } from '../../common/mocks/constants/session_view_process.mock';
import { getAlertsClientMockInstance, resetAlertingAuthMock } from './alerts_client_mock.test';

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

describe('alert_status_route.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetAlertingAuthMock();
  });

  describe('searchAlertByUuid(client, alertUuid)', () => {
    it('should return an empty events array for a non existant alert uuid', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());
      const alertsClient = getAlertsClientMockInstance(esClient);
      const body = await searchAlertByUuid(alertsClient, mockAlerts[0].kibana!.alert!.uuid!);

      expect(body.events.length).toBe(0);
    });

    it('returns results for a particular alert uuid', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getResponse());
      const alertsClient = getAlertsClientMockInstance(esClient);
      const body = await searchAlertByUuid(alertsClient, mockAlerts[0].kibana!.alert!.uuid!);

      expect(body.events.length).toBe(1);
    });
  });
});
