/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterSuggestions } from './filter_suggestions_for_autocomplete';

const defaultActionVariablesList = [
  'kibana.alert.id',
  'kibana.context.cloud.group',
  'context.container',
  'context.originalAlertState',
  'date',
  'rule.spaceId',
  'kibana.alertActionGroup',
  'tags',
];
describe('Unit tests for filterSuggestions function', () => {
  test('should return empty list if actionVariablesList argument is undefined', () => {
    expect(filterSuggestions({ propertyPath: 'alert.id' })).toEqual([]);
  });

  test('should return full sorted list of suggestions if propertyPath is empty string', () => {
    expect(
      filterSuggestions({ actionVariablesList: defaultActionVariablesList, propertyPath: '' })
    ).toEqual([
      'context',
      'context.container',
      'context.originalAlertState',
      'date',
      'kibana',
      'kibana.alert',
      'kibana.alert.id',
      'kibana.alertActionGroup',
      'kibana.context',
      'kibana.context.cloud',
      'kibana.context.cloud.group',
      'rule',
      'rule.spaceId',
      'tags',
    ]);
  });

  test('should return sorted of filtered suggestions, v1', () => {
    expect(
      filterSuggestions({ actionVariablesList: defaultActionVariablesList, propertyPath: 'ki' })
    ).toEqual([
      'kibana',
      'kibana.alert',
      'kibana.alert.id',
      'kibana.alertActionGroup',
      'kibana.context',
      'kibana.context.cloud',
      'kibana.context.cloud.group',
    ]);
  });

  test('should return sorted of filtered suggestions, v2', () => {
    expect(
      filterSuggestions({
        actionVariablesList: defaultActionVariablesList,
        propertyPath: 'kibana.al',
      })
    ).toEqual(['kibana.alert', 'kibana.alert.id', 'kibana.alertActionGroup']);
  });

  test('should return sorted of filtered suggestions, v3', () => {
    expect(
      filterSuggestions({
        actionVariablesList: defaultActionVariablesList,
        propertyPath: 'kibana.context.cloud.g',
      })
    ).toEqual(['kibana.context.cloud.group']);
  });
});
