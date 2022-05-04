/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  getAlertType,
  injectEntityAndBoundaryIds,
  GeoContainmentParams,
  extractEntityAndBoundaryReferences,
} from '../alert_type';

describe('alertType', () => {
  const logger = loggingSystemMock.create().get();

  const alertType = getAlertType(logger);

  it('alert type creation structure is the expected value', async () => {
    expect(alertType.id).toBe('.geo-containment');
    expect(alertType.name).toBe('Tracking containment');
    expect(alertType.actionGroups).toEqual([
      { id: 'Tracked entity contained', name: 'Tracking containment met' },
    ]);
    expect(alertType.recoveryActionGroup).toEqual({
      id: 'notGeoContained',
      name: 'No longer contained',
    });

    expect(alertType.actionVariables).toMatchSnapshot();
  });

  it('validator succeeds with valid params', async () => {
    const params: GeoContainmentParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndex',
      boundaryGeoField: 'testField',
      boundaryNameField: 'testField',
    };

    expect(alertType.validate?.params?.validate(params)).toBeTruthy();
  });

  test('injectEntityAndBoundaryIds', () => {
    expect(
      injectEntityAndBoundaryIds(
        {
          boundaryGeoField: 'geometry',
          boundaryIndexRefName: 'boundary_index_boundaryid',
          boundaryIndexTitle: 'boundary*',
          boundaryType: 'entireIndex',
          dateField: '@timestamp',
          entity: 'vehicle_id',
          geoField: 'geometry',
          index: 'foo*',
          indexRefName: 'tracked_index_foobar',
        },
        [
          {
            id: 'foreign',
            name: 'foobar',
            type: 'foreign',
          },
          {
            id: 'foobar',
            name: 'tracked_index_foobar',
            type: 'index-pattern',
          },
          {
            id: 'foreignToo',
            name: 'boundary_index_shouldbeignored',
            type: 'index-pattern',
          },
          {
            id: 'boundaryid',
            name: 'boundary_index_boundaryid',
            type: 'index-pattern',
          },
        ]
      )
    ).toEqual({
      index: 'foo*',
      indexId: 'foobar',
      geoField: 'geometry',
      entity: 'vehicle_id',
      dateField: '@timestamp',
      boundaryType: 'entireIndex',
      boundaryIndexTitle: 'boundary*',
      boundaryIndexId: 'boundaryid',
      boundaryGeoField: 'geometry',
    });
  });

  test('extractEntityAndBoundaryReferences', () => {
    expect(
      extractEntityAndBoundaryReferences({
        index: 'foo*',
        indexId: 'foobar',
        geoField: 'geometry',
        entity: 'vehicle_id',
        dateField: '@timestamp',
        boundaryType: 'entireIndex',
        boundaryIndexTitle: 'boundary*',
        boundaryIndexId: 'boundaryid',
        boundaryGeoField: 'geometry',
      })
    ).toEqual({
      params: {
        boundaryGeoField: 'geometry',
        boundaryIndexRefName: 'boundary_index_boundaryid',
        boundaryIndexTitle: 'boundary*',
        boundaryType: 'entireIndex',
        dateField: '@timestamp',
        entity: 'vehicle_id',
        geoField: 'geometry',
        index: 'foo*',
        indexRefName: 'tracked_index_foobar',
      },
      references: [
        {
          id: 'foobar',
          name: 'tracked_index_foobar',
          type: 'index-pattern',
        },
        {
          id: 'boundaryid',
          name: 'boundary_index_boundaryid',
          type: 'index-pattern',
        },
      ],
    });
  });
});
