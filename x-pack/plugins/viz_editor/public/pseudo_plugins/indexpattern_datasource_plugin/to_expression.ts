/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourceField, Query, SelectOperation, WhereOperation } from '../../../common';
import { VisModel } from '../../common/lib';

function isRawDocumentQuery(query: Query) {
  return query.select.every(selectOperation => selectOperation.operation === 'column');
}

function queryToEsAggsConfigs(query: Query): any {
  return [...query.select].reverse().map((selectOperation, index) => {
    switch (selectOperation.operation) {
      case 'count':
        return { enabled: true, id: String(index), params: {}, schema: 'metric', type: 'count' };
      case 'cardinality':
        return {
          enabled: true,
          id: String(index),
          params: { field: selectOperation.argument.field },
          schema: 'metric',
          type: 'cardinality',
        };
      case 'avg':
        return {
          enabled: true,
          id: String(index),
          params: { field: selectOperation.argument.field },
          schema: 'metric',
          type: 'avg',
        };
      case 'sum':
        return {
          enabled: true,
          id: String(index),
          params: { field: selectOperation.argument.field },
          schema: 'metric',
          type: 'sum',
        };
      case 'terms':
        return {
          id: String(index),
          enabled: true,
          type: 'terms',
          schema: 'segment',
          params: {
            field: selectOperation.argument.field,
            size: selectOperation.argument.size,
          },
        };
      case 'date_histogram':
        return {
          id: String(index),
          enabled: true,
          type: 'date_histogram',
          schema: 'segment',
          params: {
            field: selectOperation.argument.field,
            interval: 'd',
          },
        };
    }
  });
}

function getTypeForOperation(op: SelectOperation, fields: DatasourceField[]): string {
  switch (op.operation) {
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

function getTypes(query: Query, fields: DatasourceField[]): string[] {
  return query.select.map(operation => {
    if (operation.operation === 'column') {
      const fieldName = operation.argument.field;
      const fieldType = fields.find(field => field.name === fieldName)!.type;
      return fieldType;
    } else {
      return getTypeForOperation(operation, fields);
    }
  });
}

function whereClauseToFilter(where?: WhereOperation) {
  // TODO build something which maps this
  return {};
}

export function toExpression(viewState: VisModel) {
  if (Object.keys(viewState.queries).length === 0) {
    return '';
  }
  if (!viewState.datasource) {
    return '';
  }
  const firstQuery = Object.values(viewState.queries)[0];
  if (isRawDocumentQuery(firstQuery)) {
    return `client_esdocs index='${viewState.datasource.id}' fields='${JSON.stringify(
      firstQuery.select.map(operation =>
        operation.operation === 'column' ? operation.argument.field : ''
      )
    )}' filter='${JSON.stringify(whereClauseToFilter(firstQuery.where))}'`;
  }
  return `esaggs aggConfigs='${JSON.stringify(queryToEsAggsConfigs(firstQuery))}' index='${
    viewState.datasource.id
  }' | column_types types='${JSON.stringify(getTypes(firstQuery, viewState.datasource.fields))}'`;
}
