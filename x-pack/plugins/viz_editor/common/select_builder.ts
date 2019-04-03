/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DatasourceField } from './datasource';
import { SelectOperation, SelectOperator } from './query_types';

type OperationTemplate = { [operation in SelectOperator]: SelectOperation };

const operationTemplate: OperationTemplate = {
  count: { operation: 'count' },
  terms: { operation: 'terms', argument: { field: '', size: 5 } },
  avg: { operation: 'avg', argument: { field: '' } },
  cardinality: { operation: 'cardinality', argument: { field: '' } },
  sum: { operation: 'sum', argument: { field: '' } },
  column: { operation: 'column', argument: { field: '' } },
  date_histogram: {
    operation: 'date_histogram',
    argument: {
      field: '',
      interval: 'd',
    },
  },
};

export function getOperationTemplate(operator: SelectOperator) {
  const template: SelectOperation = { ...operationTemplate[operator] };

  if ('argument' in template) {
    // Deep clone
    template.argument = { ...template.argument };
  }

  return template;
}

export function fieldToOperation(field: DatasourceField, operator: SelectOperator) {
  const template: SelectOperation = getOperationTemplate(operator);

  if ('argument' in template) {
    template.argument.field = field.name;
  }

  template.alias = field.name;

  return template;
}
