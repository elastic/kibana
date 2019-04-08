/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DatasourceField } from './datasource';
import { SelectOperation, SelectOperator } from './query_types';

type OperationTemplate = { [operation in SelectOperator]: Partial<SelectOperation> };

const operationTemplate: OperationTemplate = {
  count: { operator: 'count' },
  terms: { operator: 'terms', argument: { field: '', size: 5 } },
  avg: { operator: 'avg', argument: { field: '' } },
  cardinality: { operator: 'cardinality', argument: { field: '' } },
  sum: { operator: 'sum', argument: { field: '' } },
  column: { operator: 'column', argument: { field: '' } },
  date_histogram: {
    operator: 'date_histogram',
    argument: {
      field: '',
      interval: 'd',
    },
  },
  window: {
    operator: 'window',
    argument: {
      field: '',
      windowFunction: 'unweightedAvg',
      windowSize: 5,
    },
  },
};

export function getOperationTemplate(operator: SelectOperator) {
  const template: Partial<SelectOperation> = { ...operationTemplate[operator] };

  if ('argument' in template) {
    // Deep clone
    template.argument = { ...template.argument } as any;
  }

  return template;
}

export function fieldToOperation(field: DatasourceField, operator: SelectOperator) {
  const template = {
    ...getOperationTemplate(operator),
    alias: field.name,
  } as SelectOperation;

  if ('argument' in template) {
    template.argument.field = field.name;
  }

  template.alias = operator === 'count' ? 'count' : field.name;

  return template;
}
