/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkSearchSessionsByPage, getSearchSessionsPage$ } from './get_search_session_page';
import { SearchSessionStatus, ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SearchSessionsConfig, SearchStatus } from './types';
import moment from 'moment';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { of, Subject, throwError } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
jest.useFakeTimers();

describe('checkSearchSessionsByPage', () => {
  const mockClient = {} as any;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  const config: SearchSessionsConfig = {
    enabled: true,
    pageSize: 5,
    management: {} as any,
  } as any;
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
  });

  describe('getSearchSessionsPage$', () => {
    test('sorting is by "touched"', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
      } as any);

      await getSearchSessionsPage$(
        {
          savedObjectsClient,
        } as any,
        {
          type: 'literal',
        },
        1,
        1
      );

      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'touched', sortOrder: 'asc' })
      );
    });
  });

  describe('pagination', () => {
    test('fetches one page if got empty response', async () => {
      const checkFn = jest.fn().mockReturnValue(of(undefined));

      await checkSearchSessionsByPage(
        checkFn,
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config,
        []
      ).toPromise();

      expect(checkFn).toHaveBeenCalledTimes(1);
    });

    test('fetches one page if got response with no saved objects', async () => {
      const checkFn = jest.fn().mockReturnValue(
        of({
          total: 0,
        })
      );

      await checkSearchSessionsByPage(
        checkFn,
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config,
        []
      ).toPromise();

      expect(checkFn).toHaveBeenCalledTimes(1);
    });

    test('fetches one page if less than page size object are returned', async () => {
      const checkFn = jest.fn().mockReturnValue(
        of({
          saved_objects: [emptySO, emptySO],
          total: 5,
        })
      );

      await checkSearchSessionsByPage(
        checkFn,
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config,
        []
      ).toPromise();

      expect(checkFn).toHaveBeenCalledTimes(1);
    });

    test('fetches two pages if exactly page size objects are returned', async () => {
      let i = 0;

      const checkFn = jest.fn().mockImplementation(() =>
        of({
          saved_objects: i++ === 0 ? [emptySO, emptySO, emptySO, emptySO, emptySO] : [],
          total: 5,
          page: i,
        })
      );

      await checkSearchSessionsByPage(
        checkFn,
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config,
        []
      ).toPromise();

      expect(checkFn).toHaveBeenCalledTimes(2);

      // validate that page number increases
      const page1 = checkFn.mock.calls[0][3];
      const page2 = checkFn.mock.calls[1][3];
      expect(page1).toBe(1);
      expect(page2).toBe(2);
    });

    test('fetches two pages if page size +1 objects are returned', async () => {
      let i = 0;

      const checkFn = jest.fn().mockImplementation(() =>
        of({
          saved_objects: i++ === 0 ? [emptySO, emptySO, emptySO, emptySO, emptySO] : [emptySO],
          total: i === 0 ? 5 : 1,
          page: i,
        })
      );

      await checkSearchSessionsByPage(
        checkFn,
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config,
        []
      ).toPromise();

      expect(checkFn).toHaveBeenCalledTimes(2);
    });

    test('sessions fetched in the beginning are processed even if sessions in the end fail', async () => {
      let i = 0;

      const checkFn = jest.fn().mockImplementation(() => {
        if (++i === 2) {
          return throwError('Fake find error...');
        }
        return of({
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
                              status: SearchStatus.IN_PROGRESS,
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
        });
      });

      await checkSearchSessionsByPage(
        checkFn,
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config,
        []
      )
        .toPromise()
        .catch(() => {});

      expect(checkFn).toHaveBeenCalledTimes(2);
    });

    test('fetching is abortable', async () => {
      let i = 0;
      const abort$ = new Subject<void>();

      const checkFn = jest.fn().mockImplementation(() => {
        if (++i === 2) {
          abort$.next();
        }

        return of({
          saved_objects: i <= 5 ? [emptySO, emptySO, emptySO, emptySO, emptySO] : [],
          total: 25,
          page: i,
        });
      });

      await checkSearchSessionsByPage(
        checkFn,
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config,
        []
      )
        .pipe(takeUntil(abort$))
        .toPromise()
        .catch(() => {});

      jest.runAllTimers();

      // if not for `abort$` then this would be called 6 times!
      expect(checkFn).toHaveBeenCalledTimes(2);
    });
  });
});
