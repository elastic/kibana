/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourceField, Query, SelectOperation } from '../../../../common';

export function getTypeForOperation(op: SelectOperation, fields: DatasourceField[]): string {
  switch (op.operator) {
    case 'count':
    case 'cardinality':
      return 'number';
    case 'date_histogram':
      return 'date';
    case 'terms':
    case 'avg':
    case 'sum':
    case 'column':
      return fields.find(field => field.name === op.argument.field)!.type;
    default:
      return 'string';
  }
}

export function getTypes(query: Query, fields: DatasourceField[]) {
  return query.select.map(operation => {
    return getTypeForOperation(operation, fields);
  });
}
