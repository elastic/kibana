/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SignalSource } from '../../../signals/types';
import { deconflictSignalsAndResults, getNotificationResultsLink } from './utils';

describe('utils', () => {
  let logger = loggingSystemMock.create().get('security_solution');

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  describe('getNotificationResultsLink', () => {
    test('it returns expected link', () => {
      const resultLink = getNotificationResultsLink({
        kibanaSiemAppUrl: 'http://localhost:5601/app/security',
        id: 'notification-id',
        from: '00000',
        to: '1111',
      });
      expect(resultLink).toEqual(
        `http://localhost:5601/app/security/detections/rules/id/notification-id?timerange=(global:(linkTo:!(timeline),timerange:(from:00000,kind:absolute,to:1111)),timeline:(linkTo:!(global),timerange:(from:00000,kind:absolute,to:1111)))`
      );
    });
  });

  describe('deconflictSignalsAndResults', () => {
    type FuncReturn = ReturnType<typeof deconflictSignalsAndResults>;

    test('given no signals and no query results it returns an empty array', () => {
      expect(
        deconflictSignalsAndResults({ logger, querySignals: [], signals: [] })
      ).toEqual<FuncReturn>([]);
    });

    test('given an empty signal and a single query result it returns the query result in the array', () => {
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
      ];
      expect(
        deconflictSignalsAndResults({ logger, querySignals, signals: [] })
      ).toEqual<FuncReturn>(querySignals);
    });

    test('given a single signal and an empty query result it returns the query result in the array', () => {
      const signals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
      ];
      expect(
        deconflictSignalsAndResults({ logger, querySignals: [], signals })
      ).toEqual<FuncReturn>(signals);
    });

    test('given a signal and a different query result it returns both combined together', () => {
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
      ];
      const signals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-789',
          _index: 'index-456',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual<FuncReturn>([
        ...signals,
        ...querySignals,
      ]);
    });

    test('given a duplicate in querySignals it returns both combined together without the duplicate', () => {
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123', // This should only show up once and not be duplicated twice
          _source: {
            test: '123',
          },
        },
        {
          _index: 'index-890',
          _id: 'id-890',
          _source: {
            test: '890',
          },
        },
      ];
      const signals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123', // This should only show up once and not be duplicated twice
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
        {
          _id: 'id-789',
          _index: 'index-456',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual<FuncReturn>([
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
        {
          _id: 'id-789',
          _index: 'index-456',
          _source: {
            test: '456',
          },
        },
        {
          _id: 'id-890',
          _index: 'index-890',
          _source: {
            test: '890',
          },
        },
      ]);
    });

    test('given a duplicate in signals it returns both combined together without the duplicate', () => {
      const signals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123', // This should only show up once and not be duplicated twice
          _source: {
            test: '123',
          },
        },
        {
          _index: 'index-890',
          _id: 'id-890',
          _source: {
            test: '890',
          },
        },
      ];
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123', // This should only show up once and not be duplicated twice
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
        {
          _id: 'id-789',
          _index: 'index-456',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual<FuncReturn>([
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: { test: '123' },
        },
        {
          _id: 'id-890',
          _index: 'index-890',
          _source: { test: '890' },
        },
        {
          _id: 'id-789',
          _index: 'index-456',
          _source: { test: '456' },
        },
      ]);
    });

    test('does not give a duplicate in signals if they are only different by their index', () => {
      const signals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123-a', // This is only different by index
          _source: {
            test: '123',
          },
        },
        {
          _index: 'index-890',
          _id: 'id-890',
          _source: {
            test: '890',
          },
        },
      ];
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123', // This is only different by index
          _index: 'index-123-b',
          _source: {
            test: '123',
          },
        },
        {
          _id: 'id-789',
          _index: 'index-456',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual<FuncReturn>([
        ...signals,
        ...querySignals,
      ]);
    });

    test('it logs a debug statement when it sees a duplicate and returns nothing if both are identical', () => {
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
      ];
      const signals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual([
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '456',
          },
        },
      ]);
      expect(logger.debug).toHaveBeenCalledWith(
        'Notification throttle removing duplicate signal and query result found of "_id": id-123, "_index": index-123'
      );
    });

    test('it logs an error statement if it sees a signal missing an "_id" for an uncommon reason and returns both documents', () => {
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
      ];
      const signals: unknown[] = [
        {
          _index: 'index-123',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual([
        ...signals,
        ...querySignals,
      ]);
      expect(logger.error).toHaveBeenCalledWith(
        'Notification throttle cannot determine if we can de-conflict as either the passed in signal or the results query has a null value for either "_id" or "_index". Expect possible duplications in your alerting actions. Passed in signals "_id": undefined. Passed in signals "_index": index-123. Passed in query "result._id": id-123. Passed in query "result._index": index-123.'
      );
    });

    test('it logs an error statement if it sees a signal missing a "_index" for an uncommon reason and returns both documents', () => {
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
      ];
      const signals: unknown[] = [
        {
          _id: 'id-123',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual([
        ...signals,
        ...querySignals,
      ]);
      expect(logger.error).toHaveBeenCalledWith(
        'Notification throttle cannot determine if we can de-conflict as either the passed in signal or the results query has a null value for either "_id" or "_index". Expect possible duplications in your alerting actions. Passed in signals "_id": id-123. Passed in signals "_index": undefined. Passed in query "result._id": id-123. Passed in query "result._index": index-123.'
      );
    });

    test('it logs an error statement if it sees a querySignals missing an "_id" for an uncommon reason and returns both documents', () => {
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _index: 'index-123',
          _source: {
            test: '123',
          },
        },
      ] as unknown[] as Array<estypes.SearchHit<SignalSource>>;
      const signals: unknown[] = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual([
        ...signals,
        ...querySignals,
      ]);
      expect(logger.error).toHaveBeenCalledWith(
        'Notification throttle cannot determine if we can de-conflict as either the passed in signal or the results query has a null value for either "_id" or "_index". Expect possible duplications in your alerting actions. Passed in signals "_id": id-123. Passed in signals "_index": index-123. Passed in query "result._id": undefined. Passed in query "result._index": index-123.'
      );
    });

    test('it logs an error statement if it sees a querySignals missing a "_index" for an uncommon reason and returns both documents', () => {
      const querySignals: Array<estypes.SearchHit<SignalSource>> = [
        {
          _id: 'id-123',
          _source: {
            test: '123',
          },
        },
      ] as unknown[] as Array<estypes.SearchHit<SignalSource>>;
      const signals: unknown[] = [
        {
          _id: 'id-123',
          _index: 'index-123',
          _source: {
            test: '456',
          },
        },
      ];
      expect(deconflictSignalsAndResults({ logger, querySignals, signals })).toEqual([
        ...signals,
        ...querySignals,
      ]);
      expect(logger.error).toHaveBeenCalledWith(
        'Notification throttle cannot determine if we can de-conflict as either the passed in signal or the results query has a null value for either "_id" or "_index". Expect possible duplications in your alerting actions. Passed in signals "_id": id-123. Passed in signals "_index": index-123. Passed in query "result._id": id-123. Passed in query "result._index": undefined.'
      );
    });
  });
});
