/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { getEntitiesAndGenerateAlerts } from './get_entities_and_generate_alerts';
import { OTHER_CATEGORY } from '../constants';
import type {
  GeoContainmentAlertInstanceState,
  GeoContainmentAlertInstanceContext,
} from '../types';

const alertFactory = (contextKeys: unknown[], testAlertActionArr: unknown[]) => ({
  create: (instanceId: string) => {
    const alertInstance = alertsMock.createAlertFactory.create<
      GeoContainmentAlertInstanceState,
      GeoContainmentAlertInstanceContext
    >();
    alertInstance.scheduleActions.mockImplementation(
      (actionGroupId: string, context?: GeoContainmentAlertInstanceContext) => {
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
  alertLimit: {
    getValue: () => 1000,
    setLimitReached: () => {},
  },
  done: () => ({ getRecoveredAlerts: () => [] }),
});

describe('getEntitiesAndGenerateAlerts', () => {
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

  test('should use currently active entities if no older entity entries', () => {
    const emptyPrevLocationMap = new Map();
    const { activeEntities } = getEntitiesAndGenerateAlerts(
      emptyPrevLocationMap,
      currLocationMap,
      alertFactory(contextKeys, testAlertActionArr),
      emptyShapesIdsNamesMap,
      currentDateTime
    );
    expect(activeEntities).toEqual(currLocationMap);
    expect(testAlertActionArr).toMatchObject(expectedAlertResults);
  });

  test('should overwrite older identical entity entries', () => {
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
    const { activeEntities } = getEntitiesAndGenerateAlerts(
      prevLocationMapWithIdenticalEntityEntry,
      currLocationMap,
      alertFactory(contextKeys, testAlertActionArr),
      emptyShapesIdsNamesMap,
      currentDateTime
    );
    expect(activeEntities).toEqual(currLocationMap);
    expect(testAlertActionArr).toMatchObject(expectedAlertResults);
  });

  test('should preserve older non-identical entity entries', () => {
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

    const { activeEntities } = getEntitiesAndGenerateAlerts(
      prevLocationMapWithNonIdenticalEntityEntry,
      currLocationMap,
      alertFactory(contextKeys, testAlertActionArr),
      emptyShapesIdsNamesMap,
      currentDateTime
    );
    expect(activeEntities).not.toEqual(currLocationMap);
    expect(activeEntities.has('d')).toBeTruthy();
    expect(testAlertActionArr).toMatchObject(expectedAlertResultsPlusD);
  });

  test('should remove "other" entries and schedule the expected number of actions', () => {
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
    const { activeEntities, inactiveEntities } = getEntitiesAndGenerateAlerts(
      emptyPrevLocationMap,
      currLocationMapWithOther,
      alertFactory(contextKeys, testAlertActionArr),
      emptyShapesIdsNamesMap,
      currentDateTime
    );
    expect(activeEntities).toEqual(currLocationMap);
    expect(inactiveEntities).toEqual(
      new Map([
        [
          'd',
          [
            {
              location: [0, 0],
              shapeLocationId: 'other',
              dateInShape: 'Wed Dec 09 2020 14:31:31 GMT-0700 (Mountain Standard Time)',
              docId: 'docId1',
            },
          ],
        ],
      ])
    );
    expect(testAlertActionArr).toMatchObject(expectedAlertResults);
  });

  test('should generate multiple alerts per entity if found in multiple shapes in interval', () => {
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
    getEntitiesAndGenerateAlerts(
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

  test('should not return entity as active entry if most recent location is "other"', () => {
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
    const { activeEntities } = getEntitiesAndGenerateAlerts(
      emptyPrevLocationMap,
      currLocationMapWithOther,
      alertFactory(contextKeys, testAlertActionArr),
      emptyShapesIdsNamesMap,
      currentDateTime
    );
    expect(activeEntities).toEqual(currLocationMap);
  });

  test('should return entity as active entry if "other" not the latest location but remove "other" and earlier entries', () => {
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
    const { activeEntities } = getEntitiesAndGenerateAlerts(
      emptyPrevLocationMap,
      currLocationMapWithOther,
      alertFactory(contextKeys, testAlertActionArr),
      emptyShapesIdsNamesMap,
      currentDateTime
    );
    expect(activeEntities).toEqual(
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
