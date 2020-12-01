/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GeoThresholdAlertParams } from './types';
import { validateExpression } from './validation';

describe('expression params validation', () => {
  test('if index property is invalid should return proper error message', () => {
    const initialParams: GeoThresholdAlertParams = {
      index: '',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: 'testEvent',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.index.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.index[0]).toBe('Index pattern is required.');
  });

  test('if geoField property is invalid should return proper error message', () => {
    const initialParams: GeoThresholdAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: '',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: 'testEvent',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.geoField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.geoField[0]).toBe('Geo field is required.');
  });

  test('if entity property is invalid should return proper error message', () => {
    const initialParams: GeoThresholdAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: '',
      dateField: 'testField',
      trackingEvent: 'testEvent',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.entity.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.entity[0]).toBe('Entity is required.');
  });

  test('if dateField property is invalid should return proper error message', () => {
    const initialParams: GeoThresholdAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: '',
      trackingEvent: 'testEvent',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.dateField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.dateField[0]).toBe('Date field is required.');
  });

  test('if trackingEvent property is invalid should return proper error message', () => {
    const initialParams: GeoThresholdAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: '',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.trackingEvent.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.trackingEvent[0]).toBe(
      'Tracking event is required.'
    );
  });

  test('if boundaryType property is invalid should return proper error message', () => {
    const initialParams: GeoThresholdAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: 'testEvent',
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
    const initialParams: GeoThresholdAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: 'testEvent',
      boundaryType: 'testType',
      boundaryIndexTitle: '',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
    };
    expect(validateExpression(initialParams).errors.boundaryIndexTitle.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.boundaryIndexTitle[0]).toBe(
      'Boundary index pattern title is required.'
    );
  });

  test('if boundaryGeoField property is invalid should return proper error message', () => {
    const initialParams: GeoThresholdAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: 'testEvent',
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
    const initialParams: GeoThresholdAlertParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      trackingEvent: 'testEvent',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndexId',
      boundaryGeoField: 'testField',
      boundaryNameField: '',
    };
    expect(validateExpression(initialParams).errors.boundaryGeoField.length).toBe(0);
  });
});
