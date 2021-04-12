/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '../../../../../../../src/core/server/mocks';
import { getAlertType, GeoContainmentParams } from '../alert_type';

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
});
