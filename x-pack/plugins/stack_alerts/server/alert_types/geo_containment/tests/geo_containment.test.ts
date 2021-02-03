/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sampleJsonResponse from './es_sample_response.json';
import sampleJsonResponseWithNesting from './es_sample_response_with_nesting.json';
import { getActiveEntriesAndGenerateAlerts, transformResults } from '../geo_containment';
import { SearchResponse } from 'elasticsearch';
import { OTHER_CATEGORY } from '../es_query_builder';
import { alertsMock } from '../../../../../alerts/server/mocks';
import { GeoContainmentInstanceContext, GeoContainmentInstanceState } from '../alert_type';

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
            [
              {
                dateInShape: '2020-09-28T18:01:41.190Z',
                docId: 'N-ng1XQB6yyY-xQxnGSM',
                location: [-82.8814151789993, 40.62806099653244],
                shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
              },
            ],
          ],
          [
            'AAL2019',
            [
              {
                dateInShape: '2020-09-28T18:01:41.191Z',
                docId: 'iOng1XQB6yyY-xQxnGSM',
                location: [-82.22068064846098, 39.006176185794175],
                shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
              },
            ],
          ],
          [
            'AAL2323',
            [
              {
                dateInShape: '2020-09-28T18:01:41.191Z',
                docId: 'n-ng1XQB6yyY-xQxnGSM',
                location: [-84.71324851736426, 41.6677269525826],
                shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
              },
            ],
          ],
          [
            'ABD5250',
            [
              {
                dateInShape: '2020-09-28T18:01:41.192Z',
                docId: 'GOng1XQB6yyY-xQxnGWM',
                location: [6.073727197945118, 39.07997465226799],
                shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
              },
            ],
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
            [
              {
                dateInShape: '2020-09-28T18:01:41.190Z',
                docId: 'N-ng1XQB6yyY-xQxnGSM',
                location: [-82.8814151789993, 40.62806099653244],
                shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
              },
            ],
          ],
          [
            'AAL2019',
            [
              {
                dateInShape: '2020-09-28T18:01:41.191Z',
                docId: 'iOng1XQB6yyY-xQxnGSM',
                location: [-82.22068064846098, 39.006176185794175],
                shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
              },
            ],
          ],
          [
            'AAL2323',
            [
              {
                dateInShape: '2020-09-28T18:01:41.191Z',
                docId: 'n-ng1XQB6yyY-xQxnGSM',
                location: [-84.71324851736426, 41.6677269525826],
                shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
              },
            ],
          ],
          [
            'ABD5250',
            [
              {
                dateInShape: '2020-09-28T18:01:41.192Z',
                docId: 'GOng1XQB6yyY-xQxnGWM',
                location: [6.073727197945118, 39.07997465226799],
                shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
              },
            ],
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
    beforeEach(() => {
      jest.clearAllMocks();
      testAlertActionArr.length = 0;
    });

    const currLocationMap = new Map([
      [
        'a',
        [
          {
            location: [0, 0],
            shapeLocationId: '123',
            dateInShape: 'Wed Dec 09 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
            docId: 'docId1',
          },
        ],
      ],
      [
        'b',
        [
          {
            location: [0, 0],
            shapeLocationId: '456',
            dateInShape: 'Wed Dec 16 2020 15:31:31 GMT-0700 (Mountain Standard Time)',
            docId: 'docId2',
          },
        ],
      ],
      [
        'c',
        [
          {
            location: [0, 0],
            shapeLocationId: '789',
            dateInShape: 'Wed Dec 23 2020 16:31:31 GMT-0700 (Mountain Standard Time)',
            docId: 'docId3',
          },
        ],
      ],
    ]);

    const expectedContext = [
      {
        actionGroupId: 'Tracked entity contained',
        context: {
          containingBoundaryId: '123',
          entityDocumentId: 'docId1',
          entityId: 'a',
          entityLocation: 'POINT (0 0)',
        },
        instanceId: 'a-123',
      },
      {
        actionGroupId: 'Tracked entity contained',
        context: {
          containingBoundaryId: '456',
          entityDocumentId: 'docId2',
          entityId: 'b',
          entityLocation: 'POINT (0 0)',
        },
        instanceId: 'b-456',
      },
      {
        actionGroupId: 'Tracked entity contained',
        context: {
          containingBoundaryId: '789',
          entityDocumentId: 'docId3',
          entityId: 'c',
          entityLocation: 'POINT (0 0)',
        },
        instanceId: 'c-789',
      },
    ];
    const emptyShapesIdsNamesMap = {};

    const alertInstanceFactory = (instanceId: string) => {
      const alertInstance = alertsMock.createAlertInstanceFactory<
        GeoContainmentInstanceState,
        GeoContainmentInstanceContext
      >();
      alertInstance.scheduleActions.mockImplementation(
        (actionGroupId: string, context?: GeoContainmentInstanceContext) => {
          const contextKeys = Object.keys(expectedContext[0].context);
          const contextSubset = _.pickBy(context, (v, k) => contextKeys.includes(k));
          testAlertActionArr.push({
            actionGroupId,
            instanceId,
            context: contextSubset,
          });
          return alertInstance;
        }
      );
      return alertInstance;
    };

    const currentDateTime = new Date();

    it('should use currently active entities if no older entity entries', () => {
      const emptyPrevLocationMap = new Map();
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        emptyPrevLocationMap,
        currLocationMap,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(testAlertActionArr).toMatchObject(expectedContext);
    });
    it('should overwrite older identical entity entries', () => {
      const prevLocationMapWithIdenticalEntityEntry = new Map([
        [
          'a',
          [
            {
              location: [0, 0],
              shapeLocationId: '999',
              dateInShape: 'Wed Dec 09 2020 12:31:31 GMT-0700 (Mountain Standard Time)',
              docId: 'docId7',
            },
          ],
        ],
      ]);
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        prevLocationMapWithIdenticalEntityEntry,
        currLocationMap,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(testAlertActionArr).toMatchObject(expectedContext);
    });
    it('should preserve older non-identical entity entries', () => {
      const prevLocationMapWithNonIdenticalEntityEntry = new Map([
        [
          'd',
          [
            {
              location: [0, 0],
              shapeLocationId: '999',
              dateInShape: 'Wed Dec 09 2020 12:31:31 GMT-0700 (Mountain Standard Time)',
              docId: 'docId7',
            },
          ],
        ],
      ]);
      const expectedContextPlusD = [
        {
          actionGroupId: 'Tracked entity contained',
          context: {
            containingBoundaryId: '999',
            entityDocumentId: 'docId7',
            entityId: 'd',
            entityLocation: 'POINT (0 0)',
          },
          instanceId: 'd-999',
        },
        ...expectedContext,
      ];

      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        prevLocationMapWithNonIdenticalEntityEntry,
        currLocationMap,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).not.toEqual(currLocationMap);
      expect(allActiveEntriesMap.has('d')).toBeTruthy();
      expect(testAlertActionArr).toMatchObject(expectedContextPlusD);
    });

    it('should remove "other" entries and schedule the expected number of actions', () => {
      const emptyPrevLocationMap = new Map();
      const currLocationMapWithOther = new Map([...currLocationMap]).set('d', [
        {
          location: [0, 0],
          shapeLocationId: OTHER_CATEGORY,
          dateInShape: 'Wed Dec 09 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
      ]);
      expect(currLocationMapWithOther).not.toEqual(currLocationMap);
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        emptyPrevLocationMap,
        currLocationMapWithOther,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(testAlertActionArr).toMatchObject(expectedContext);
    });

    it('should generate multiple alerts per entity if found in multiple shapes in interval', () => {
      const emptyPrevLocationMap = new Map();
      const currLocationMapWithThreeMore = new Map([...currLocationMap]).set('d', [
        {
          location: [0, 0],
          shapeLocationId: '789',
          dateInShape: 'Wed Dec 10 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
        {
          location: [0, 0],
          shapeLocationId: '123',
          dateInShape: 'Wed Dec 08 2020 12:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId2',
        },
        {
          location: [0, 0],
          shapeLocationId: '456',
          dateInShape: 'Wed Dec 07 2020 10:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId3',
        },
      ]);
      getActiveEntriesAndGenerateAlerts(
        emptyPrevLocationMap,
        currLocationMapWithThreeMore,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      let numEntitiesInShapes = 0;
      currLocationMapWithThreeMore.forEach((v) => {
        numEntitiesInShapes += v.length;
      });
      expect(testAlertActionArr.length).toEqual(numEntitiesInShapes);
    });

    it('should not return entity as active entry if most recent location is "other"', () => {
      const emptyPrevLocationMap = new Map();
      const currLocationMapWithOther = new Map([...currLocationMap]).set('d', [
        {
          location: [0, 0],
          shapeLocationId: OTHER_CATEGORY,
          dateInShape: 'Wed Dec 10 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
        {
          location: [0, 0],
          shapeLocationId: '123',
          dateInShape: 'Wed Dec 08 2020 12:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
        {
          location: [0, 0],
          shapeLocationId: '456',
          dateInShape: 'Wed Dec 07 2020 10:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
      ]);
      expect(currLocationMapWithOther).not.toEqual(currLocationMap);
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        emptyPrevLocationMap,
        currLocationMapWithOther,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
    });

    it('should return entity as active entry if "other" not the latest location but remove "other" and earlier entries', () => {
      const emptyPrevLocationMap = new Map();
      const currLocationMapWithOther = new Map([...currLocationMap]).set('d', [
        {
          location: [0, 0],
          shapeLocationId: '123',
          dateInShape: 'Wed Dec 10 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
        {
          location: [0, 0],
          shapeLocationId: OTHER_CATEGORY,
          dateInShape: 'Wed Dec 08 2020 12:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
        {
          location: [0, 0],
          shapeLocationId: '456',
          dateInShape: 'Wed Dec 07 2020 10:31:31 GMT-0700 (Mountain Standard Time)',
          docId: 'docId1',
        },
      ]);
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        emptyPrevLocationMap,
        currLocationMapWithOther,
        alertInstanceFactory,
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(
        new Map([...currLocationMap]).set('d', [
          {
            location: [0, 0],
            shapeLocationId: '123',
            dateInShape: 'Wed Dec 10 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
            docId: 'docId1',
          },
        ])
      );
    });
  });
});
