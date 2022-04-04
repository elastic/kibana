/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { loggingSystemMock, elasticsearchServiceMock } from 'src/core/server/mocks';
import { RuleExecutorServicesMock, alertsMock } from '../../../../../alerting/server/mocks';
import sampleAggsJsonResponse from './es_sample_response.json';
import sampleShapesJsonResponse from './es_sample_response_shapes.json';
import sampleAggsJsonResponseWithNesting from './es_sample_response_with_nesting.json';
import {
  getActiveEntriesAndGenerateAlerts,
  transformResults,
  getGeoContainmentExecutor,
} from '../geo_containment';
import { OTHER_CATEGORY } from '../es_query_builder';
import { GeoContainmentInstanceContext, GeoContainmentInstanceState } from '../alert_type';
import type { GeoContainmentParams } from '../alert_type';

const alertFactory = (contextKeys: unknown[], testAlertActionArr: unknown[]) => ({
  create: (instanceId: string) => {
    const alertInstance = alertsMock.createAlertFactory.create<
      GeoContainmentInstanceState,
      GeoContainmentInstanceContext
    >();
    alertInstance.scheduleActions.mockImplementation(
      (actionGroupId: string, context?: GeoContainmentInstanceContext) => {
        // Check subset of alert for comparison to expected results
        // @ts-ignore
        const contextSubset = _.pickBy(context, (v, k) => contextKeys.includes(k));
        testAlertActionArr.push({
          actionGroupId,
          instanceId,
          context: contextSubset,
        });
      }
    );
    return alertInstance;
  },
  done: () => ({ getRecoveredAlerts: () => [] }),
});

describe('geo_containment', () => {
  describe('transformResults', () => {
    const dateField = '@timestamp';
    const geoField = 'location';
    it('should correctly transform expected results', async () => {
      const transformedResults = transformResults(
        // @ts-ignore
        sampleAggsJsonResponse.body,
        dateField,
        geoField
      );
      expect(transformedResults).toEqual(
        new Map([
          [
            '0',
            [
              {
                dateInShape: '2021-04-28T16:56:11.923Z',
                docId: 'ZVBoGXkBsFLYN2Tj1wmV',
                location: [-73.99018926545978, 40.751759740523994],
                shapeLocationId: 'kFATGXkBsFLYN2Tj6AAk',
              },
              {
                dateInShape: '2021-04-28T16:56:01.896Z',
                docId: 'YlBoGXkBsFLYN2TjsAlp',
                location: [-73.98968475870788, 40.7506317878142],
                shapeLocationId: 'other',
              },
            ],
          ],
          [
            '1',
            [
              {
                dateInShape: '2021-04-28T16:56:11.923Z',
                docId: 'ZlBoGXkBsFLYN2Tj1wmV',
                location: [-73.99561604484916, 40.75449890457094],
                shapeLocationId: 'kFATGXkBsFLYN2Tj6AAk',
              },
              {
                dateInShape: '2021-04-28T16:56:01.896Z',
                docId: 'Y1BoGXkBsFLYN2TjsAlp',
                location: [-73.99459345266223, 40.755913141183555],
                shapeLocationId: 'other',
              },
            ],
          ],
          [
            '2',
            [
              {
                dateInShape: '2021-04-28T16:56:11.923Z',
                docId: 'Z1BoGXkBsFLYN2Tj1wmV',
                location: [-73.98662586696446, 40.7667087810114],
                shapeLocationId: 'other',
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
        // @ts-ignore
        sampleAggsJsonResponseWithNesting.body,
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

    const expectedAlertResults = [
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
    const contextKeys = Object.keys(expectedAlertResults[0].context);
    const emptyShapesIdsNamesMap = {};

    const currentDateTime = new Date();

    it('should use currently active entities if no older entity entries', () => {
      const emptyPrevLocationMap = new Map();
      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        emptyPrevLocationMap,
        currLocationMap,
        alertFactory(contextKeys, testAlertActionArr),
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(testAlertActionArr).toMatchObject(expectedAlertResults);
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
        alertFactory(contextKeys, testAlertActionArr),
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(testAlertActionArr).toMatchObject(expectedAlertResults);
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
      const expectedAlertResultsPlusD = [
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
        ...expectedAlertResults,
      ];

      const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
        prevLocationMapWithNonIdenticalEntityEntry,
        currLocationMap,
        alertFactory(contextKeys, testAlertActionArr),
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).not.toEqual(currLocationMap);
      expect(allActiveEntriesMap.has('d')).toBeTruthy();
      expect(testAlertActionArr).toMatchObject(expectedAlertResultsPlusD);
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
        alertFactory(contextKeys, testAlertActionArr),
        emptyShapesIdsNamesMap,
        currentDateTime
      );
      expect(allActiveEntriesMap).toEqual(currLocationMap);
      expect(testAlertActionArr).toMatchObject(expectedAlertResults);
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
        alertFactory(contextKeys, testAlertActionArr),
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
        alertFactory(contextKeys, testAlertActionArr),
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
        alertFactory(contextKeys, testAlertActionArr),
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

  describe('getGeoContainmentExecutor', () => {
    // Params needed for all tests
    const expectedAlertResults = [
      {
        actionGroupId: 'Tracked entity contained',
        context: {
          containingBoundaryId: 'kFATGXkBsFLYN2Tj6AAk',
          entityDocumentId: 'ZVBoGXkBsFLYN2Tj1wmV',
          entityId: '0',
          entityLocation: 'POINT (-73.99018926545978 40.751759740523994)',
        },
        instanceId: '0-kFATGXkBsFLYN2Tj6AAk',
      },
      {
        actionGroupId: 'Tracked entity contained',
        context: {
          containingBoundaryId: 'kFATGXkBsFLYN2Tj6AAk',
          entityDocumentId: 'ZlBoGXkBsFLYN2Tj1wmV',
          entityId: '1',
          entityLocation: 'POINT (-73.99561604484916 40.75449890457094)',
        },
        instanceId: '1-kFATGXkBsFLYN2Tj6AAk',
      },
    ];
    const testAlertActionArr: unknown[] = [];
    const mockLogger = loggingSystemMock.createLogger();
    const previousStartedAt = new Date('2021-04-27T16:56:11.923Z');
    const startedAt = new Date('2021-04-29T16:56:11.923Z');
    const geoContainmentParams: GeoContainmentParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'location',
      entity: 'testEntity',
      dateField: '@timestamp',
      boundaryType: 'testBoundaryType',
      boundaryIndexTitle: 'testBoundaryIndexTitle',
      boundaryIndexId: 'testBoundaryIndexId',
      boundaryGeoField: 'testBoundaryGeoField',
    };
    const alertId = 'testAlertId';
    const geoContainmentState = {
      shapesFilters: {
        testShape: 'thisIsAShape',
      },
      shapesIdsNamesMap: {},
      prevLocationMap: {},
    };

    // Boundary test mocks
    const boundaryCall = jest.fn();
    const esAggCall = jest.fn();
    const contextKeys = Object.keys(expectedAlertResults[0].context);
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    // @ts-ignore incomplete return type
    esClient.search.mockResponseImplementation(({ index }) => {
      if (index === geoContainmentParams.boundaryIndexTitle) {
        boundaryCall();
        return sampleShapesJsonResponse;
      } else {
        esAggCall();
        return sampleAggsJsonResponse;
      }
    });

    const alertServicesWithSearchMock: RuleExecutorServicesMock = {
      ...alertsMock.createRuleExecutorServices(),
      // @ts-ignore
      alertFactory: alertFactory(contextKeys, testAlertActionArr),
      // @ts-ignore
      scopedClusterClient: {
        asCurrentUser: esClient,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      testAlertActionArr.length = 0;
    });

    it('should query for shapes if state does not contain shapes', async () => {
      const executor = await getGeoContainmentExecutor(mockLogger);
      // @ts-ignore
      const executionResult = await executor({
        previousStartedAt,
        startedAt,
        // @ts-ignore
        services: alertServicesWithSearchMock,
        params: geoContainmentParams,
        alertId,
        // @ts-ignore
        state: {},
      });
      if (executionResult && executionResult.shapesFilters) {
        expect(boundaryCall.mock.calls.length).toBe(1);
        expect(esAggCall.mock.calls.length).toBe(1);
      }
      expect(testAlertActionArr).toMatchObject(expectedAlertResults);
    });

    it('should not query for shapes if state contains shapes', async () => {
      const executor = await getGeoContainmentExecutor(mockLogger);
      // @ts-ignore
      const executionResult = await executor({
        previousStartedAt,
        startedAt,
        // @ts-ignore
        services: alertServicesWithSearchMock,
        params: geoContainmentParams,
        alertId,
        state: geoContainmentState,
      });
      if (executionResult && executionResult.shapesFilters) {
        expect(boundaryCall.mock.calls.length).toBe(0);
        expect(esAggCall.mock.calls.length).toBe(1);
      }
      expect(testAlertActionArr).toMatchObject(expectedAlertResults);
    });

    it('should carry through shapes filters in state to next call unmodified', async () => {
      const executor = await getGeoContainmentExecutor(mockLogger);
      // @ts-ignore
      const executionResult = await executor({
        previousStartedAt,
        startedAt,
        // @ts-ignore
        services: alertServicesWithSearchMock,
        params: geoContainmentParams,
        alertId,
        state: geoContainmentState,
      });
      if (executionResult && executionResult.shapesFilters) {
        expect(executionResult.shapesFilters).toEqual(geoContainmentState.shapesFilters);
      }
      expect(testAlertActionArr).toMatchObject(expectedAlertResults);
    });

    it('should return previous locations map', async () => {
      const expectedPrevLocationMap = {
        '0': [
          {
            dateInShape: '2021-04-28T16:56:11.923Z',
            docId: 'ZVBoGXkBsFLYN2Tj1wmV',
            location: [-73.99018926545978, 40.751759740523994],
            shapeLocationId: 'kFATGXkBsFLYN2Tj6AAk',
          },
        ],
        '1': [
          {
            dateInShape: '2021-04-28T16:56:11.923Z',
            docId: 'ZlBoGXkBsFLYN2Tj1wmV',
            location: [-73.99561604484916, 40.75449890457094],
            shapeLocationId: 'kFATGXkBsFLYN2Tj6AAk',
          },
        ],
      };
      const executor = await getGeoContainmentExecutor(mockLogger);
      // @ts-ignore
      const executionResult = await executor({
        previousStartedAt,
        startedAt,
        // @ts-ignore
        services: alertServicesWithSearchMock,
        params: geoContainmentParams,
        alertId,
        state: geoContainmentState,
      });
      if (executionResult && executionResult.prevLocationMap) {
        expect(executionResult.prevLocationMap).toEqual(expectedPrevLocationMap);
      }
      expect(testAlertActionArr).toMatchObject(expectedAlertResults);
    });
  });
});
