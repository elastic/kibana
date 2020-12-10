/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sampleJsonResponse from './es_sample_response.json';
import sampleJsonResponseWithNesting from './es_sample_response_with_nesting.json';
import { getActiveEntriesAndGenerateAlerts, transformResults } from '../geo_containment';
import { SearchResponse } from 'elasticsearch';
import { OTHER_CATEGORY } from '../es_query_builder';

describe('geo_containment', () => {
  describe('transformResults', () => {
    const dateField = '@timestamp';
    const geoField = 'location';
    it('should correctly transform expected results', async () => {
      const transformedResults = transformResults(
        (sampleJsonResponse as unknown) as SearchResponse<unknown>,
        dateField,
        geoField
      );
      expect(transformedResults).toEqual(
        new Map([
          [
            '936',
            {
              dateInShape: '2020-09-28T18:01:41.190Z',
              docId: 'N-ng1XQB6yyY-xQxnGSM',
              location: [-82.8814151789993, 40.62806099653244],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
          [
            'AAL2019',
            {
              dateInShape: '2020-09-28T18:01:41.191Z',
              docId: 'iOng1XQB6yyY-xQxnGSM',
              location: [-82.22068064846098, 39.006176185794175],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
          [
            'AAL2323',
            {
              dateInShape: '2020-09-28T18:01:41.191Z',
              docId: 'n-ng1XQB6yyY-xQxnGSM',
              location: [-84.71324851736426, 41.6677269525826],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
          [
            'ABD5250',
            {
              dateInShape: '2020-09-28T18:01:41.192Z',
              docId: 'GOng1XQB6yyY-xQxnGWM',
              location: [6.073727197945118, 39.07997465226799],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
        ])
      );
    });

    const nestedDateField = 'time_data.@timestamp';
    const nestedGeoField = 'geo.coords.location';
    it('should correctly transform expected results if fields are nested', async () => {
      const transformedResults = transformResults(
        (sampleJsonResponseWithNesting as unknown) as SearchResponse<unknown>,
        nestedDateField,
        nestedGeoField
      );
      expect(transformedResults).toEqual(
        new Map([
          [
            '936',
            {
              dateInShape: '2020-09-28T18:01:41.190Z',
              docId: 'N-ng1XQB6yyY-xQxnGSM',
              location: [-82.8814151789993, 40.62806099653244],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
          [
            'AAL2019',
            {
              dateInShape: '2020-09-28T18:01:41.191Z',
              docId: 'iOng1XQB6yyY-xQxnGSM',
              location: [-82.22068064846098, 39.006176185794175],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
          [
            'AAL2323',
            {
              dateInShape: '2020-09-28T18:01:41.191Z',
              docId: 'n-ng1XQB6yyY-xQxnGSM',
              location: [-84.71324851736426, 41.6677269525826],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
          [
            'ABD5250',
            {
              dateInShape: '2020-09-28T18:01:41.192Z',
              docId: 'GOng1XQB6yyY-xQxnGWM',
              location: [6.073727197945118, 39.07997465226799],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
        ])
      );
    });

    it('should return an empty array if no results', async () => {
      const transformedResults = transformResults(undefined, dateField, geoField);
      expect(transformedResults).toEqual(new Map());
    });
  });

  describe('getActiveEntriesAndGenerateAlerts', () => {
    const testAlertActionArr: unknown[] = [];
    afterEach(() => {
      jest.clearAllMocks();
      testAlertActionArr.length = 0;
    });

    const currLocationMap = new Map([
      [
        'a',
        {
          location: [0, 0],
          shapeLocationId: '123',
          dateInShape: 'Wed Dec 09 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
      ],
      [
        'b',
        {
          location: [0, 0],
          shapeLocationId: '456',
          dateInShape: 'Wed Dec 09 2020 15:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId2',
        },
      ],
      [
        'c',
        {
          location: [0, 0],
          shapeLocationId: '789',
          dateInShape: 'Wed Dec 09 2020 16:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId3',
        },
      ],
    ]);
    const emptyShapesIdsNamesMap = {};

    const scheduleActions = jest.fn((alertInstance: string, context: Record<string, unknown>) => {
      testAlertActionArr.push(context.entityId);
    });
    const alertInstanceFactory = (x: string) => ({ scheduleActions });
    const currentDateTime = new Date();

    it('should use currently active entities if no older entity entries', () => {
      const emptyPrevLocationMap = {};
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        emptyPrevLocationMap,
        currLocationMap,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(scheduleActions.mock.calls.length).toEqual(allActiveEntriesMap.size);
      expect(testAlertActionArr).toEqual([...allActiveEntriesMap.keys()]);
    });
    it('should overwrite older identical entity entries', () => {
      const prevLocationMapWithIdenticalEntityEntry = {
        a: {
          location: [0, 0],
          shapeLocationId: '999',
          dateInShape: 'Wed Dec 09 2020 12:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId7',
        },
      };
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        prevLocationMapWithIdenticalEntityEntry,
        currLocationMap,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(scheduleActions.mock.calls.length).toEqual(allActiveEntriesMap.size);
      expect(testAlertActionArr).toEqual([...allActiveEntriesMap.keys()]);
    });
    it('should preserve older non-identical entity entries', () => {
      const prevLocationMapWithNonIdenticalEntityEntry = {
        d: {
          location: [0, 0],
          shapeLocationId: '999',
          dateInShape: 'Wed Dec 09 2020 12:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId7',
        },
      };
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        prevLocationMapWithNonIdenticalEntityEntry,
        currLocationMap,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).not.toEqual(currLocationMap);
      expect(allActiveEntriesMap.has('d')).toBeTruthy();
      expect(scheduleActions.mock.calls.length).toEqual(allActiveEntriesMap.size);
      expect(testAlertActionArr).toEqual([...allActiveEntriesMap.keys()]);
    });
    it('should remove "other" entries and schedule the expected number of actions', () => {
      const emptyPrevLocationMap = {};
      const currLocationMapWithOther = new Map(currLocationMap).set('d', {
        location: [0, 0],
        shapeLocationId: OTHER_CATEGORY,
        dateInShape: 'Wed Dec 09 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
        docId: 'docId1',
      });
      expect(currLocationMapWithOther).not.toEqual(currLocationMap);
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        emptyPrevLocationMap,
        currLocationMapWithOther,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(scheduleActions.mock.calls.length).toEqual(allActiveEntriesMap.size);
      expect(testAlertActionArr).toEqual([...allActiveEntriesMap.keys()]);
    });
  });
});
