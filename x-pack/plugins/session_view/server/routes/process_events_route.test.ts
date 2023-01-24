/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchEventsAndScopedAlerts } from './process_events_route';
import { mockEvents, mockAlerts } from '../../common/mocks/constants/session_view_process.mock';
import { getAlertsClientMockInstance, resetAlertingAuthMock } from './alerts_client_mock.test';
import { EventAction, EventKind, ProcessEvent } from '../../common/types/process_tree';

const getEmptyResponse = async () => {
  return {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: [],
    },
  };
};

const getResponse = async () => {
  return {
    hits: {
      total: { value: mockEvents.length, relation: 'eq' },
      hits: mockEvents.map((event) => {
        return { _source: event };
      }),
    },
  };
};

describe('process_events_route.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    resetAlertingAuthMock();
  });

  describe('fetchEventsAndScopedAlerts(client, entityId, cursor, forward)', () => {
    it('should return an empty events array for a non existant entity_id', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());
      const alertsClient = getAlertsClientMockInstance(client);

      const body = await fetchEventsAndScopedAlerts(client, alertsClient, 'asdf', undefined);

      expect(body.events.length).toBe(0);
      expect(body.total).toBe(0);
    });

    it('returns results for a particular session entity_id', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getResponse());
      const alertsClient = getAlertsClientMockInstance();

      const body = await fetchEventsAndScopedAlerts(client, alertsClient, 'mockId', undefined);

      expect(body.events.length).toBe(mockEvents.length + mockAlerts.length);

      const eventsOnly = body.events.filter(
        (event) => (event._source as ProcessEvent)?.event?.kind === EventKind.event
      );
      const alertsOnly = body.events.filter(
        (event) => (event._source as ProcessEvent)?.event?.kind === EventKind.signal
      );
      expect(eventsOnly.length).toBe(mockEvents.length);
      expect(alertsOnly.length).toBe(mockAlerts.length);
      expect(body.total).toBe(mockEvents.length);
    });

    it('returns hits in reverse order when paginating backwards', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getResponse());
      const alertsClient = getAlertsClientMockInstance();

      const body = await fetchEventsAndScopedAlerts(
        client,
        alertsClient,
        'mockId',
        undefined,
        false
      );

      // output events are mixed in
      const eventsWithoutOutput = body.events.filter((event) => {
        const { action, kind } = (event._source as ProcessEvent)?.event || {};

        return action !== EventAction.text_output && kind === EventKind.event;
      });

      expect(eventsWithoutOutput[0]._source).toEqual(mockEvents[mockEvents.length - 1]);
    });
  });
});
