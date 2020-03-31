/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventLogClient } from './event_log_client';
import { contextMock } from './es/context.mock';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { merge } from 'lodash';

describe('EventLogStart', () => {
  describe('getEventsBySavedObject', () => {
    test('verifies that the user can to access the specified saved object', async () => {
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

      await eventLogClient.getEventsBySavedObject('saved-object-type', 'saved-object-id');

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
        eventLogClient.getEventsBySavedObject('saved-object-type', 'saved-object-id')
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

      esContext.esAdapter.queryEventsBySavedObject.mockResolvedValue(expectedEvents);

      expect(
        await eventLogClient.getEventsBySavedObject('saved-object-type', 'saved-object-id')
      ).toEqual(expectedEvents);

      expect(esContext.esAdapter.queryEventsBySavedObject).toHaveBeenCalledWith(
        esContext.esNames.alias,
        'saved-object-type',
        'saved-object-id',
        {}
      );
    });
  });
});

function fakeEvent(overrides = {}) {
  return merge(
    {
      event: {
        provider: 'actions',
        action: 'execute',
        start: new Date('2020-03-30T14:55:47.054Z'),
        end: new Date('2020-03-30T14:55:47.055Z'),
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
      '@timestamp': new Date('2020-03-30T14:55:47.055Z'),
      ecs: {
        version: '1.3.1',
      },
    },
    overrides
  );
}
