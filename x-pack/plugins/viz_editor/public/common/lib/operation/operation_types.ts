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
      return fields.find(field => field.name === op.argument.field)!.type;
    default:
      return 'string';
  }
}

export function getTypes(query: Query, fields: DatasourceField[]): string[] {
  return query.select.map(operation => {
    if (operation.operator === 'column') {
      const fieldName = operation.argument.field;
      const fieldType = fields.find(field => field.name === fieldName)!.type;
      return fieldType;
    } else {
      return getTypeForOperation(operation, fields);
    }
  });
}
