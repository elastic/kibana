/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkRunningSessions as checkRunningSessions$,
  CheckRunningSessionsDeps,
} from './check_running_sessions';
import {
  SearchSessionStatus,
  SearchSessionSavedObjectAttributes,
  ENHANCED_ES_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
} from '../../../../../../src/plugins/data/common';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { SearchSessionsConfig, SearchStatus } from './types';
import moment from 'moment';
import {
  SavedObjectsBulkUpdateObject,
  SavedObjectsDeleteOptions,
  SavedObjectsClientContract,
} from '../../../../../../src/core/server';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

jest.useFakeTimers();

const checkRunningSessions = (deps: CheckRunningSessionsDeps, config: SearchSessionsConfig) =>
  checkRunningSessions$(deps, config).toPromise();

describe('getSearchStatus', () => {
  let mockClient: any;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  const config: SearchSessionsConfig = {
    enabled: true,
    pageSize: 5,
    notTouchedInProgressTimeout: moment.duration(1, 'm'),
    notTouchedTimeout: moment.duration(5, 'm'),
    maxUpdateRetries: 3,
    defaultExpiration: moment.duration(7, 'd'),
    trackingInterval: moment.duration(10, 's'),
    monitoringTaskTimeout: moment.duration(5, 'm'),
    management: {} as any,
  };
  const mockLogger: any = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const emptySO = {
    attributes: {
      persisted: false,
      status: SearchSessionStatus.IN_PROGRESS,
      created: moment().subtract(moment.duration(3, 'm')),
      touched: moment().subtract(moment.duration(10, 's')),
      idMapping: {},
    },
  };

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    mockClient = {
      asyncSearch: {
        status: jest.fn(),
        delete: jest.fn(),
      },
      eql: {
        status: jest.fn(),
        delete: jest.fn(),
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

  describe('pagination', () => {
    test('fetches one page if not objects exist', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
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

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    });

    test('fetches one page if less than page size object are returned', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [emptySO, emptySO],
        total: 5,
      } as any);

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    });

    test('fetches two pages if exactly page size objects are returned', async () => {
      let i = 0;
      savedObjectsClient.find.mockImplementation(() => {
        return new Promise((resolve) => {
          resolve({
            saved_objects: i++ === 0 ? [emptySO, emptySO, emptySO, emptySO, emptySO] : [],
            total: 5,
            page: i,
          } as any);
        });
      });

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);

      // validate that page number increases
      const { page: page1 } = savedObjectsClient.find.mock.calls[0][0];
      const { page: page2 } = savedObjectsClient.find.mock.calls[1][0];
      expect(page1).toBe(1);
      expect(page2).toBe(2);
    });

    test('fetches two pages if page size +1 objects are returned', async () => {
      let i = 0;
      savedObjectsClient.find.mockImplementation(() => {
        return new Promise((resolve) => {
          resolve({
            saved_objects: i++ === 0 ? [emptySO, emptySO, emptySO, emptySO, emptySO] : [emptySO],
            total: 5,
            page: i,
          } as any);
        });
      });

      await checkRunningSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);
    });

    test('fetching is abortable', async () => {
      let i = 0;
      const abort$ = new Subject();
      savedObjectsClient.find.mockImplementation(() => {
        return new Promise((resolve) => {
          if (++i === 2) {
            abort$.next();
          }
          resolve({
            saved_objects: i <= 5 ? [emptySO, emptySO, emptySO, emptySO, emptySO] : [],
            total: 25,
            page: i,
          } as any);
        });
      });

      await checkRunningSessions$(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      )
        .pipe(takeUntil(abort$))
        .toPromise();

      jest.runAllTimers();

      // if not for `abort$` then this would be called 6 times!
      expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);
    });

    test('sorting is by "touched"', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
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

      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'touched', sortOrder: 'asc' })
      );
    });

    test('sessions fetched in the beginning are processed even if sessions in the end fail', async () => {
      let i = 0;
      savedObjectsClient.find.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          if (++i === 2) {
            reject(new Error('Fake find error...'));
          }
          resolve({
            saved_objects:
              i <= 5
                ? [
                    i === 1
                      ? {
                          id: '123',
                          attributes: {
                            persisted: false,
                            status: SearchSessionStatus.IN_PROGRESS,
                            created: moment().subtract(moment.duration(3, 'm')),
                            touched: moment().subtract(moment.duration(2, 'm')),
                            idMapping: {
                              'map-key': {
                                strategy: ENHANCED_ES_SEARCH_STRATEGY,
                                id: 'async-id',
                              },
                            },
                          },
                        }
                      : emptySO,
                    emptySO,
                    emptySO,
                    emptySO,
                    emptySO,
                  ]
                : [],
            total: 25,
            page: i,
          } as any);
        });
      });

      await checkRunningSessions$(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      ).toPromise();

      jest.runAllTimers();

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);

      // by checking that delete was called we validate that sessions from session that were successfully fetched were processed
      expect(mockClient.asyncSearch.delete).toBeCalled();
      const { id } = mockClient.asyncSearch.delete.mock.calls[0][0];
      expect(id).toBe('async-id');
    });
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

    test('deletes in space', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            namespaces: ['awesome'],
            attributes: {
              persisted: false,
              status: SearchSessionStatus.IN_PROGRESS,
              created: moment().subtract(moment.duration(3, 'm')),
              touched: moment().subtract(moment.duration(2, 'm')),
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
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

      expect(savedObjectsClient.delete).toBeCalled();

      const [, id, opts] = savedObjectsClient.delete.mock.calls[0];
      expect(id).toBe('123');
      expect((opts as SavedObjectsDeleteOptions).namespace).toBe('awesome');
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
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
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
      expect(savedObjectsClient.delete).toBeCalled();

      expect(mockClient.asyncSearch.delete).toBeCalled();

      const { id } = mockClient.asyncSearch.delete.mock.calls[0][0];
      expect(id).toBe('async-id');
    });

    test('deletes a completed, not persisted session', async () => {
      mockClient.asyncSearch.delete = jest.fn().mockResolvedValue(true);

      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.COMPLETE,
              created: moment().subtract(moment.duration(30, 'm')),
              touched: moment().subtract(moment.duration(6, 'm')),
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
                  status: SearchStatus.COMPLETE,
                },
                'eql-map-key': {
                  strategy: EQL_SEARCH_STRATEGY,
                  id: 'eql-async-id',
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
      expect(savedObjectsClient.delete).toBeCalled();

      expect(mockClient.asyncSearch.delete).toBeCalled();
      expect(mockClient.eql.delete).not.toBeCalled();

      const { id } = mockClient.asyncSearch.delete.mock.calls[0][0];
      expect(id).toBe('async-id');
    });

    test('ignores errors thrown while deleting async searches', async () => {
      mockClient.asyncSearch.delete = jest.fn().mockRejectedValueOnce(false);

      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.COMPLETE,
              created: moment().subtract(moment.duration(30, 'm')),
              touched: moment().subtract(moment.duration(6, 'm')),
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
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
      expect(savedObjectsClient.delete).toBeCalled();

      expect(mockClient.asyncSearch.delete).toBeCalled();

      const { id } = mockClient.asyncSearch.delete.mock.calls[0][0];
      expect(id).toBe('async-id');
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

    test('updates in space', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        namespaces: ['awesome'],
        attributes: {
          status: SearchSessionStatus.IN_PROGRESS,
          touched: '123',
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
      const updatedAttributes = updateInput[0] as SavedObjectsBulkUpdateObject;
      expect(updatedAttributes.namespace).toBe('awesome');
    });

    test('updates to complete if the search is done', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        attributes: {
          status: SearchSessionStatus.IN_PROGRESS,
          touched: '123',
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
      expect(updatedAttributes.touched).not.toBe('123');
      expect(updatedAttributes.completed).not.toBeUndefined();
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
