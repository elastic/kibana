/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkRunningSessions } from './check_running_sessions';
import { SearchSessionStatus, SearchSessionSavedObjectAttributes } from '../../../common';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import type { SavedObjectsClientContract } from 'kibana/server';
import { SearchSessionsConfig, SearchStatus } from './types';
import moment from 'moment';

describe('getSearchStatus', () => {
  let mockClient: any;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  const config: SearchSessionsConfig = {
    enabled: true,
    pageSize: 10000,
    notTouchedTimeout: moment.duration(1, 'm'),
    onScreenTimeout: moment.duration(5, 'm'),
    maxUpdateRetries: 3,
    defaultExpiration: moment.duration(7, 'd'),
    trackingInterval: moment.duration(10, 's'),
    management: {} as any,
  };
  const mockLogger: any = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    mockClient = {
      asyncSearch: {
        status: jest.fn(),
      },
    };
  });

  test('does nothing if there are no open sessions', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
    } as any);

    await checkRunningSessions(
      {
        savedObjectsClient,
        client: mockClient,
        logger: mockLogger,
      },
      config
    );

    expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
    expect(savedObjectsClient.delete).not.toBeCalled();
  });

  describe('delete', () => {
    test('doesnt delete a persisted session', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: true,
              status: SearchSessionStatus.IN_PROGRESS,
              created: moment().subtract(moment.duration(30, 'm')),
              touched: moment().subtract(moment.duration(10, 'm')),
              idMapping: {},
            },
          },
        ],
        total: 1,
      } as any);
      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('doesnt delete a non persisted, recently touched session', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.IN_PROGRESS,
              created: moment().subtract(moment.duration(3, 'm')),
              touched: moment().subtract(moment.duration(10, 's')),
              idMapping: {},
            },
          },
        ],
        total: 1,
      } as any);
      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('doesnt delete a non persisted, completed session, within on screen time frame', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.COMPLETE,
              created: moment().subtract(moment.duration(3, 'm')),
              touched: moment().subtract(moment.duration(1, 'm')),
              idMapping: {
                'search-hash': {
                  id: 'search-id',
                  strategy: 'cool',
                  status: SearchStatus.COMPLETE,
                },
              },
            },
          },
        ],
        total: 1,
      } as any);
      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('deletes a non persisted, abandoned session', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.IN_PROGRESS,
              created: moment().subtract(moment.duration(3, 'm')),
              touched: moment().subtract(moment.duration(2, 'm')),
              idMapping: {},
            },
          },
        ],
        total: 1,
      } as any);

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).toBeCalled();
    });

    test('deletes a completed, not persisted session', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.COMPLETE,
              created: moment().subtract(moment.duration(30, 'm')),
              touched: moment().subtract(moment.duration(5, 'm')),
              idMapping: {},
            },
          },
        ],
        total: 1,
      } as any);

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).toBeCalled();
    });
  });

  describe('update', () => {
    test('does nothing if the search is still running', async () => {
      const so = {
        id: '123',
        attributes: {
          persisted: false,
          status: SearchSessionStatus.IN_PROGRESS,
          created: moment().subtract(moment.duration(3, 'm')),
          touched: moment().subtract(moment.duration(10, 's')),
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: true,
          is_running: true,
        },
      });

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test("doesn't re-check completed or errored searches", async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      savedObjectsClient.delete = jest.fn();
      const so = {
        id: '123',
        attributes: {
          status: SearchSessionStatus.ERROR,
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.COMPLETE,
            },
            'another-search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.ERROR,
            },
          },
        },
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(mockClient.asyncSearch.status).not.toBeCalled();
      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('updates to complete if the search is done', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        attributes: {
          status: SearchSessionStatus.IN_PROGRESS,
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 200,
        },
      });

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(mockClient.asyncSearch.status).toBeCalledWith({ id: 'search-id' });
      const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];
      const updatedAttributes = updateInput[0].attributes as SearchSessionSavedObjectAttributes;
      expect(updatedAttributes.status).toBe(SearchSessionStatus.COMPLETE);
      expect(updatedAttributes.idMapping['search-hash'].status).toBe(SearchStatus.COMPLETE);
      expect(updatedAttributes.idMapping['search-hash'].error).toBeUndefined();

      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('updates to error if the search is errored', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        attributes: {
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 500,
        },
      });

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );
      const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];

      const updatedAttributes = updateInput[0].attributes as SearchSessionSavedObjectAttributes;
      expect(updatedAttributes.status).toBe(SearchSessionStatus.ERROR);
      expect(updatedAttributes.idMapping['search-hash'].status).toBe(SearchStatus.ERROR);
      expect(updatedAttributes.idMapping['search-hash'].error).toBe(
        'Search completed with a 500 status'
      );
    });
  });
});
