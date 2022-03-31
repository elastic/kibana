/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapFiltersToKql } from './map_filters_to_kql';

describe('mapFiltersToKql', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should handle no filters', () => {
    expect(mapFiltersToKql({})).toEqual([]);
  });

  test('should handle typesFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
      })
    ).toEqual(['alert.attributes.alertTypeId:(type or filter)']);
  });

  test('should handle actionTypesFilter', () => {
    expect(
      mapFiltersToKql({
        actionTypesFilter: ['action', 'types', 'filter'],
      })
    ).toEqual([
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
    ]);
  });

  test('should handle ruleStatusesFilter', () => {
    expect(
      mapFiltersToKql({
        ruleStatusesFilter: ['alert', 'statuses', 'filter'],
      })
    ).toEqual(['alert.attributes.executionStatus.status:(alert or statuses or filter)']);
  });

  test('should handle typesFilter and actionTypesFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
        actionTypesFilter: ['action', 'types', 'filter'],
      })
    ).toEqual([
      'alert.attributes.alertTypeId:(type or filter)',
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
    ]);
  });

  test('should handle typesFilter, actionTypesFilter and ruleStatusesFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
        actionTypesFilter: ['action', 'types', 'filter'],
        ruleStatusesFilter: ['alert', 'statuses', 'filter'],
      })
    ).toEqual([
      'alert.attributes.alertTypeId:(type or filter)',
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
      'alert.attributes.executionStatus.status:(alert or statuses or filter)',
    ]);
  });
});
