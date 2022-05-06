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
      const body = await searchAlerts(alertsClient, 'asdf');

      expect(body.events.length).toBe(0);
    });

    it('returns results for a particular session entity_id', async () => {
      const alertsClient = getAlertsClientMockInstance();

      const body = await searchAlerts(alertsClient, 'asdf');

      expect(body.events.length).toBe(mockAlerts.length);
    });
  });
});
