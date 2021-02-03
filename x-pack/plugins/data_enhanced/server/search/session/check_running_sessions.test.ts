/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkRunningSessions } from './check_running_sessions';
import { SearchSessionStatus, SearchSessionSavedObjectAttributes } from '../../../common';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import type { SavedObjectsClientContract } from 'kibana/server';
import { SearchStatus } from './types';

describe('getSearchStatus', () => {
  let mockClient: any;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
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
    savedObjectsClient.bulkUpdate = jest.fn();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
    } as any);

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);

    expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
  });

  test('does nothing if there are no searchIds in the saved object', async () => {
    savedObjectsClient.bulkUpdate = jest.fn();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          attributes: {
            idMapping: {},
          },
        },
      ],
      total: 1,
    } as any);

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);

    expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
  });

  test('does nothing if the search is still running', async () => {
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
        is_partial: true,
        is_running: true,
      },
    });

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);

    expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
  });

  test("doesn't re-check completed or errored searches", async () => {
    savedObjectsClient.bulkUpdate = jest.fn();
    const so = {
      attributes: {
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

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);

    expect(mockClient.asyncSearch.status).not.toBeCalled();
  });

  test('updates to complete if the search is done', async () => {
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
        completion_status: 200,
      },
    });

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);

    expect(mockClient.asyncSearch.status).toBeCalledWith({ id: 'search-id' });
    const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];
    const updatedAttributes = updateInput[0].attributes as SearchSessionSavedObjectAttributes;
    expect(updatedAttributes.status).toBe(SearchSessionStatus.COMPLETE);
    expect(updatedAttributes.idMapping['search-hash'].status).toBe(SearchStatus.COMPLETE);
    expect(updatedAttributes.idMapping['search-hash'].error).toBeUndefined();
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

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);
    const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];

    const updatedAttributes = updateInput[0].attributes as SearchSessionSavedObjectAttributes;
    expect(updatedAttributes.status).toBe(SearchSessionStatus.ERROR);
    expect(updatedAttributes.idMapping['search-hash'].status).toBe(SearchStatus.ERROR);
    expect(updatedAttributes.idMapping['search-hash'].error).toBe(
      'Search completed with a 500 status'
    );
  });
});
