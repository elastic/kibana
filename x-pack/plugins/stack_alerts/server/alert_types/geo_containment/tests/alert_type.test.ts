/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock } from '../../../../../../../src/core/server/mocks';
import { getAlertType, GeoContainmentParams } from '../alert_type';

describe('alertType', () => {
  const logger = loggingSystemMock.create().get();

  const alertType = getAlertType(logger);

  it('alert type creation structure is the expected value', async () => {
    expect(alertType.id).toBe('.geo-containment');
    expect(alertType.name).toBe('Geo tracking containment');
    expect(alertType.actionGroups).toEqual([
      { id: 'tracking containment met', name: 'Tracking containment met' },
    ]);

    expect(alertType.actionVariables).toMatchSnapshot();
  });

  it('validator succeeds with valid params', async () => {
    const params: GeoContainmentParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: 'testEvent',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndex',
      boundaryGeoField: 'testField',
      boundaryNameField: 'testField',
      delayOffsetWithUnits: 'testOffset',
    };

    expect(alertType.validate?.params?.validate(params)).toBeTruthy();
  });

  it('validator fails with invalid params', async () => {
    const paramsSchema = alertType.validate?.params;
    if (!paramsSchema) throw new Error('params validator not set');

    const params: GeoContainmentParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: '',
      boundaryType: 'testType',
      boundaryIndexTitle: '',
      boundaryIndexId: 'testIndex',
      boundaryGeoField: 'testField',
      boundaryNameField: 'testField',
    };

    expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
      `"[trackingEvent]: value has length [0] but it must have a minimum length of [1]."`
    );
  });
});
