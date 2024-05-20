/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { RuleExecutorServicesMock, alertsMock } from '@kbn/alerting-plugin/server/mocks';
import sampleAggsJsonResponse from './tests/es_sample_response.json';
import sampleShapesJsonResponse from './tests/es_sample_response_shapes.json';
import { executor } from './executor';
import type { GeoContainmentRuleParams, GeoContainmentAlertInstanceContext } from './types';

describe('executor', () => {
  const expectedAlerts = [
    {
      context: {
        containingBoundaryId: 'kFATGXkBsFLYN2Tj6AAk',
        entityDocumentId: 'ZVBoGXkBsFLYN2Tj1wmV',
        entityId: '0',
        entityLocation: 'POINT (-73.99018926545978 40.751759740523994)',
      },
      instanceId: '0-kFATGXkBsFLYN2Tj6AAk',
    },
    {
      context: {
        containingBoundaryId: 'kFATGXkBsFLYN2Tj6AAk',
        entityDocumentId: 'ZlBoGXkBsFLYN2Tj1wmV',
        entityId: '1',
        entityLocation: 'POINT (-73.99561604484916 40.75449890457094)',
      },
      instanceId: '1-kFATGXkBsFLYN2Tj6AAk',
    },
  ];

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

  const alerts: unknown[] = [];
  const servicesMock: RuleExecutorServicesMock = {
    ...alertsMock.createRuleExecutorServices(),
    // @ts-ignore
    alertsClient: {
      getRecoveredAlerts: () => {
        return [];
      },
      report: ({ id, context }: { id: string; context: GeoContainmentAlertInstanceContext }) => {
        alerts.push({
          context: {
            containingBoundaryId: context.containingBoundaryId,
            entityDocumentId: context.entityDocumentId,
            entityId: context.entityId,
            entityLocation: context.entityLocation,
          },
          instanceId: id,
        });
      },
    },
    // @ts-ignore
    scopedClusterClient: {
      asCurrentUser: esClient,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alerts.length = 0;
  });

  test('should query for shapes if state does not contain shapes', async () => {
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: servicesMock,
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
    expect(alerts).toMatchObject(expectedAlerts);
  });

  test('should query for shapes if boundaries request meta changes', async () => {
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: servicesMock,
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
    expect(alerts).toMatchObject(expectedAlerts);
  });

  test('should not query for shapes if state contains shapes', async () => {
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: servicesMock,
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
    expect(alerts).toMatchObject(expectedAlerts);
  });

  test('should carry through shapes filters in state to next call unmodified', async () => {
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: servicesMock,
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
    expect(alerts).toMatchObject(expectedAlerts);
  });

  test('should return previous locations map', async () => {
    const expectedPrevLocationMap = {
      '0': [
        {
          dateInShape: '2021-04-28T16:56:11.923Z',
          docId: 'ZVBoGXkBsFLYN2Tj1wmV',
          location: [0, 0],
          locationWkt: 'POINT (-73.99018926545978 40.751759740523994)',
          shapeLocationId: 'kFATGXkBsFLYN2Tj6AAk',
        },
      ],
      '1': [
        {
          dateInShape: '2021-04-28T16:56:11.923Z',
          docId: 'ZlBoGXkBsFLYN2Tj1wmV',
          location: [0, 0],
          locationWkt: 'POINT (-73.99561604484916 40.75449890457094)',
          shapeLocationId: 'kFATGXkBsFLYN2Tj6AAk',
        },
      ],
    };
    const executionResult = await executor({
      previousStartedAt,
      startedAt,
      // @ts-ignore
      services: servicesMock,
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
    expect(alerts).toMatchObject(expectedAlerts);
  });
});
