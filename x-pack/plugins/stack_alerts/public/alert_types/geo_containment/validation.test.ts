/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoContainmentAlertParams } from './types';
import { validateExpression } from './validation';

describe('expression params validation', () => {
  test('if index property is invalid should return proper error message', () => {
    const initialParams: GeoContainmentAlertParams = {
      index: '',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.index.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.index[0]).toBe('Data view is required.');
  });

  test('if geoField property is invalid should return proper error message', () => {
    const initialParams: GeoContainmentAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: '',
      entity: 'testField',
      dateField: 'testField',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.geoField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.geoField[0]).toBe('Geo field is required.');
  });

  test('if entity property is invalid should return proper error message', () => {
    const initialParams: GeoContainmentAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: '',
      dateField: 'testField',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.entity.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.entity[0]).toBe('Entity is required.');
  });

  test('if dateField property is invalid should return proper error message', () => {
    const initialParams: GeoContainmentAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: '',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.dateField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.dateField[0]).toBe('Date field is required.');
  });

  test('if boundaryType property is invalid should return proper error message', () => {
    const initialParams: GeoContainmentAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      boundaryType: '',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.boundaryType.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.boundaryType[0]).toBe(
      'Boundary type is required.'
    );
  });

  test('if boundaryIndexTitle property is invalid should return proper error message', () => {
    const initialParams: GeoContainmentAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      boundaryType: 'testType',
      boundaryIndexTitle: '',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.boundaryIndexTitle.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.boundaryIndexTitle[0]).toBe(
      'Boundary data view title is required.'
    );
  });

  test('if boundaryGeoField property is invalid should return proper error message', () => {
    const initialParams: GeoContainmentAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: '',
    };
    expect(validateExpression(initialParams).errors.boundaryGeoField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.boundaryGeoField[0]).toBe(
      'Boundary geo field is required.'
    );
  });

  test('if boundaryNameField property is missing should not return error', () => {
    const initialParams: GeoContainmentAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
      boundaryNameField: '',
    };
    expect(validateExpression(initialParams).errors.boundaryGeoField.length).toBe(0);
  });
});
