/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CountOperation,
  DatasourceField,
  SelectOperation,
  SelectOperator,
} from '../../../../common';

type OperationsWithFields = Extract<SelectOperation, { argument: { field: any } }>;
const argumentsTemplate: { [operator in SelectOperator]: SelectOperation['argument'] } = {
  count: {},
  terms: { field: '', size: 5 },
  avg: { field: '' },
  cardinality: { field: '' },
  sum: { field: '' },
  column: { field: '' },
  date_histogram: { field: '', interval: '1d' },
};

export function getOperationTemplate(operator: SelectOperator): SelectOperation {
  if (operator === 'count') {
    return { operator, argument: {} } as CountOperation;
  }

  return {
    operator,
    argument: { ...argumentsTemplate[operator] },
  } as Exclude<SelectOperation, CountOperation>;
}

export function fieldToOperation(field: DatasourceField, operator: SelectOperator) {
  const template: SelectOperation = getOperationTemplate(operator);

  if ('field' in argumentsTemplate[operator]) {
    (template as OperationsWithFields).argument.field = field.name;
  }

  template.alias = field.name;

  return template;
}
