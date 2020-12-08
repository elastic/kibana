/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkRunningSessions } from './check_running_sessions';
import { BackgroundSessionSavedObjectAttributes, BackgroundSessionStatus } from '../../../common';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import type { SavedObjectsClientContract } from 'kibana/server';

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
      transport: {
        request: jest.fn(),
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
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          attributes: {
            idMapping: {
              'search-hash': 'search-id',
            },
          },
        },
      ],
      total: 1,
    } as any);

    mockClient.transport.request.mockResolvedValue({
      is_partial: true,
      is_running: true,
    });

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);

    expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
  });

  test('updates to complete if the search is done', async () => {
    savedObjectsClient.bulkUpdate = jest.fn();
    const so = {
      attributes: {
        idMapping: {
          'search-hash': 'search-id',
        },
      },
    };
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [so],
      total: 1,
    } as any);

    mockClient.transport.request.mockResolvedValue({
      is_partial: false,
      is_running: false,
      completion_status: 200,
    });

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);
    const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];
    expect((updateInput[0].attributes as BackgroundSessionSavedObjectAttributes).status).toBe(
      BackgroundSessionStatus.COMPLETE
    );
  });

  test('updates to error if the search is errored', async () => {
    savedObjectsClient.bulkUpdate = jest.fn();
    const so = {
      attributes: {
        idMapping: {
          'search-hash': 'search-id',
        },
      },
    };
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [so],
      total: 1,
    } as any);

    mockClient.transport.request.mockResolvedValue({
      is_partial: false,
      is_running: false,
      completion_status: 500,
    });

    await checkRunningSessions(savedObjectsClient, mockClient, mockLogger);
    const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];
    expect((updateInput[0].attributes as BackgroundSessionSavedObjectAttributes).status).toBe(
      BackgroundSessionStatus.ERROR
    );
  });
});
