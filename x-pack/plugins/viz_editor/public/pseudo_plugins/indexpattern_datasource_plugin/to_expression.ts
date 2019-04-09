/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query, WhereOperation } from '../../../common';
import { getTypes, VisModel } from '../../../public';

function isRawDocumentQuery(query: Query) {
  return query.select.every(selectOperation => selectOperation.operator === 'column');
}

function queryToEsAggsConfigs(query: Query): any {
  return query.select.map((selectOperation, index) => {
    switch (selectOperation.operator) {
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
        const { field, size, orderBy, orderByDirection } = selectOperation.argument;
        const orderByTerms = orderBy === index;
        const orderSettings =
          typeof orderBy !== 'undefined'
            ? {
                order: orderByDirection || 'desc',
                orderBy: orderByTerms ? '_key' : String(orderBy),
              }
            : {};
        return {
          id: String(index),
          enabled: true,
          type: 'terms',
          schema: 'segment',
          params: {
            field,
            size,
            ...orderSettings,
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
            interval: selectOperation.argument.interval,
          },
        };
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
        operation.operator === 'column' ? operation.argument.field : ''
      )
    )}' fieldNames='${JSON.stringify(
      firstQuery.select.map(operation => (operation.operator === 'column' ? operation.alias : ''))
    )}' filter='${JSON.stringify(whereClauseToFilter(firstQuery.where))}'`;
  }
  return `esaggs aggConfigs='${JSON.stringify(queryToEsAggsConfigs(firstQuery))}' index='${
    viewState.datasource.id
  }' | column_types types='${JSON.stringify(getTypes(firstQuery, viewState.datasource.fields))}'`;
}
