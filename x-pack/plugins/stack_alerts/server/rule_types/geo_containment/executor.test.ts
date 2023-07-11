/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { RuleExecutorServicesMock, alertsMock } from '@kbn/alerting-plugin/server/mocks';
import sampleAggsJsonResponse from './tests/es_sample_response.json';
import sampleShapesJsonResponse from './tests/es_sample_response_shapes.json';
import { executor } from './executor';
import type {
  GeoContainmentRuleParams,
  GeoContainmentAlertInstanceState,
  GeoContainmentAlertInstanceContext,
} from './types';

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
  const previousStartedAt = new Date('2021-04-27T16:56:11.923Z');
  const startedAt = new Date('2021-04-29T16:56:11.923Z');
  const geoContainmentParams: GeoContainmentRuleParams = {
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
  const ruleId = 'testAlertId';
  const geoContainmentState = {
    boundariesRequestMeta: {
      geoField: geoContainmentParams.geoField,
      boundaryIndexTitle: geoContainmentParams.boundaryIndexTitle,
      boundaryGeoField: geoContainmentParams.boundaryGeoField,
    },
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

  test('should query for shapes if state does not contain shapes', async () => {
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: alertServicesWithSearchMock,
      params: geoContainmentParams,
      // @ts-ignore
      rule: {
        id: ruleId,
      },
      // @ts-ignore
      state: {},
    });
    if (executionResult && executionResult.state.shapesFilters) {
      expect(boundaryCall.mock.calls.length).toBe(1);
      expect(esAggCall.mock.calls.length).toBe(1);
    }
    expect(testAlertActionArr).toMatchObject(expectedAlertResults);
  });

  test('should query for shapes if boundaries request meta changes', async () => {
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: alertServicesWithSearchMock,
      params: geoContainmentParams,
      // @ts-ignore
      rule: {
        id: ruleId,
      },
      // @ts-ignore
      state: {
        ...geoContainmentState,
        boundariesRequestMeta: {
          ...geoContainmentState.boundariesRequestMeta,
          geoField: 'otherLocation',
        },
      },
    });
    if (executionResult && executionResult.state.shapesFilters) {
      expect(boundaryCall.mock.calls.length).toBe(1);
      expect(esAggCall.mock.calls.length).toBe(1);
    }
    expect(testAlertActionArr).toMatchObject(expectedAlertResults);
  });

  test('should not query for shapes if state contains shapes', async () => {
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: alertServicesWithSearchMock,
      params: geoContainmentParams,
      // @ts-ignore
      rule: {
        id: ruleId,
      },
      state: geoContainmentState,
    });
    if (executionResult && executionResult.state.shapesFilters) {
      expect(boundaryCall.mock.calls.length).toBe(0);
      expect(esAggCall.mock.calls.length).toBe(1);
    }
    expect(testAlertActionArr).toMatchObject(expectedAlertResults);
  });

  test('should carry through shapes filters in state to next call unmodified', async () => {
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: alertServicesWithSearchMock,
      params: geoContainmentParams,
      // @ts-ignore
      rule: {
        id: ruleId,
      },
      state: geoContainmentState,
    });
    if (executionResult && executionResult.state.shapesFilters) {
      expect(executionResult.state.shapesFilters).toEqual(geoContainmentState.shapesFilters);
    }
    expect(testAlertActionArr).toMatchObject(expectedAlertResults);
  });

  test('should return previous locations map', async () => {
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
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: alertServicesWithSearchMock,
      params: geoContainmentParams,
      // @ts-ignore
      rule: {
        id: ruleId,
      },
      state: geoContainmentState,
    });
    if (executionResult && executionResult.state.prevLocationMap) {
      expect(executionResult.state.prevLocationMap).toEqual(expectedPrevLocationMap);
    }
    expect(testAlertActionArr).toMatchObject(expectedAlertResults);
  });
});
