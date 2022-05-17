/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { searchAlerts } from './alerts_route';
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

describe('alerts_route.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    resetAlertingAuthMock();
  });

  describe('searchAlerts(client, sessionEntityId)', () => {
    it('should return an empty events array for a non existant entity_id', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());
      const alertsClient = getAlertsClientMockInstance(esClient);
      const body = await searchAlerts(alertsClient, 'asdf', 100);

      expect(body.events.length).toBe(0);
    });

    it('returns results for a particular session entity_id', async () => {
      const alertsClient = getAlertsClientMockInstance();

      const body = await searchAlerts(alertsClient, 'asdf', 100);

      expect(body.events.length).toBe(mockAlerts.length);
    });

    it('takes an investigatedAlertId', async () => {
      const alertsClient = getAlertsClientMockInstance();

      const body = await searchAlerts(alertsClient, 'asdf', 100, mockAlerts[0].kibana?.alert?.uuid);

      expect(body.events.length).toBe(mockAlerts.length + 1);
    });

    it('takes a range', async () => {
      const alertsClient = getAlertsClientMockInstance();

      const start = '2021-11-23T15:25:04.210Z';
      const end = '2021-20-23T15:25:04.210Z';
      const body = await searchAlerts(alertsClient, 'asdf', 100, undefined, [start, end]);

      expect(body.events.length).toBe(mockAlerts.length);
    });
  });
});
