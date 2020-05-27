/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventLogClient } from './event_log_client';
import { contextMock } from './es/context.mock';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { merge } from 'lodash';
import moment from 'moment';

describe('EventLogStart', () => {
  describe('findEventsBySavedObject', () => {
    test('verifies that the user can access the specified saved object', async () => {
      const esContext = contextMock.create();
      const savedObjectsClient = savedObjectsClientMock.create();
      const eventLogClient = new EventLogClient({
        esContext,
        savedObjectsClient,
      });

      savedObjectsClient.get.mockResolvedValueOnce({
        id: 'saved-object-id',
        type: 'saved-object-type',
        attributes: {},
        references: [],
      });

      await eventLogClient.findEventsBySavedObject('saved-object-type', 'saved-object-id');

      expect(savedObjectsClient.get).toHaveBeenCalledWith('saved-object-type', 'saved-object-id');
    });

    test('throws when the user doesnt have permission to access the specified saved object', async () => {
      const esContext = contextMock.create();
      const savedObjectsClient = savedObjectsClientMock.create();
      const eventLogClient = new EventLogClient({
        esContext,
        savedObjectsClient,
      });

      savedObjectsClient.get.mockRejectedValue(new Error('Fail'));

      expect(
        eventLogClient.findEventsBySavedObject('saved-object-type', 'saved-object-id')
      ).rejects.toMatchInlineSnapshot(`[Error: Fail]`);
    });

    test('fetches all event that reference the saved object', async () => {
      const esContext = contextMock.create();
      const savedObjectsClient = savedObjectsClientMock.create();
      const eventLogClient = new EventLogClient({
        esContext,
        savedObjectsClient,
      });

      savedObjectsClient.get.mockResolvedValueOnce({
        id: 'saved-object-id',
        type: 'saved-object-type',
        attributes: {},
        references: [],
      });

      const expectedEvents = [
        fakeEvent({
          kibana: {
            saved_objects: [
              {
                id: 'saved-object-id',
                type: 'saved-object-type',
              },
              {
                type: 'action',
                id: '1',
              },
            ],
          },
        }),
        fakeEvent({
          kibana: {
            saved_objects: [
              {
                id: 'saved-object-id',
                type: 'saved-object-type',
              },
              {
                type: 'action',
                id: '2',
              },
            ],
          },
        }),
      ];

      const result = {
        page: 0,
        per_page: 10,
        total: expectedEvents.length,
        data: expectedEvents,
      };
      esContext.esAdapter.queryEventsBySavedObject.mockResolvedValue(result);

      expect(
        await eventLogClient.findEventsBySavedObject('saved-object-type', 'saved-object-id')
      ).toEqual(result);

      expect(esContext.esAdapter.queryEventsBySavedObject).toHaveBeenCalledWith(
        esContext.esNames.alias,
        'saved-object-type',
        'saved-object-id',
        {
          page: 1,
          per_page: 10,
          sort_field: '@timestamp',
          sort_order: 'asc',
        }
      );
    });

    test('fetches all events in time frame that reference the saved object', async () => {
      const esContext = contextMock.create();
      const savedObjectsClient = savedObjectsClientMock.create();
      const eventLogClient = new EventLogClient({
        esContext,
        savedObjectsClient,
      });

      savedObjectsClient.get.mockResolvedValueOnce({
        id: 'saved-object-id',
        type: 'saved-object-type',
        attributes: {},
        references: [],
      });

      const expectedEvents = [
        fakeEvent({
          kibana: {
            saved_objects: [
              {
                id: 'saved-object-id',
                type: 'saved-object-type',
              },
              {
                type: 'action',
                id: '1',
              },
            ],
          },
        }),
        fakeEvent({
          kibana: {
            saved_objects: [
              {
                id: 'saved-object-id',
                type: 'saved-object-type',
              },
              {
                type: 'action',
                id: '2',
              },
            ],
          },
        }),
      ];

      const result = {
        page: 0,
        per_page: 10,
        total: expectedEvents.length,
        data: expectedEvents,
      };
      esContext.esAdapter.queryEventsBySavedObject.mockResolvedValue(result);

      const start = moment().subtract(1, 'days').toISOString();
      const end = moment().add(1, 'days').toISOString();

      expect(
        await eventLogClient.findEventsBySavedObject('saved-object-type', 'saved-object-id', {
          start,
          end,
        })
      ).toEqual(result);

      expect(esContext.esAdapter.queryEventsBySavedObject).toHaveBeenCalledWith(
        esContext.esNames.alias,
        'saved-object-type',
        'saved-object-id',
        {
          page: 1,
          per_page: 10,
          sort_field: '@timestamp',
          sort_order: 'asc',
          start,
          end,
        }
      );
    });

    test('validates that the start date is valid', async () => {
      const esContext = contextMock.create();
      const savedObjectsClient = savedObjectsClientMock.create();
      const eventLogClient = new EventLogClient({
        esContext,
        savedObjectsClient,
      });

      savedObjectsClient.get.mockResolvedValueOnce({
        id: 'saved-object-id',
        type: 'saved-object-type',
        attributes: {},
        references: [],
      });

      esContext.esAdapter.queryEventsBySavedObject.mockResolvedValue({
        page: 0,
        per_page: 0,
        total: 0,
        data: [],
      });

      expect(
        eventLogClient.findEventsBySavedObject('saved-object-type', 'saved-object-id', {
          start: 'not a date string',
        })
      ).rejects.toMatchInlineSnapshot(`[Error: [start]: Invalid Date]`);
    });

    test('validates that the end date is valid', async () => {
      const esContext = contextMock.create();
      const savedObjectsClient = savedObjectsClientMock.create();
      const eventLogClient = new EventLogClient({
        esContext,
        savedObjectsClient,
      });

      savedObjectsClient.get.mockResolvedValueOnce({
        id: 'saved-object-id',
        type: 'saved-object-type',
        attributes: {},
        references: [],
      });

      esContext.esAdapter.queryEventsBySavedObject.mockResolvedValue({
        page: 0,
        per_page: 0,
        total: 0,
        data: [],
      });

      expect(
        eventLogClient.findEventsBySavedObject('saved-object-type', 'saved-object-id', {
          end: 'not a date string',
        })
      ).rejects.toMatchInlineSnapshot(`[Error: [end]: Invalid Date]`);
    });
  });
});

function fakeEvent(overrides = {}) {
  return merge(
    {
      event: {
        provider: 'actions',
        action: 'execute',
        start: '2020-03-30T14:55:47.054Z',
        end: '2020-03-30T14:55:47.055Z',
        duration: 1000000,
      },
      kibana: {
        namespace: 'default',
        saved_objects: [
          {
            type: 'action',
            id: '968f1b82-0414-4a10-becc-56b6473e4a29',
          },
        ],
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      },
      message: 'action executed: .server-log:968f1b82-0414-4a10-becc-56b6473e4a29: logger',
      '@timestamp': '2020-03-30T14:55:47.055Z',
      ecs: {
        version: '1.3.1',
      },
    },
    overrides
  );
}
