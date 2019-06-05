/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { IndexPatternPrivateState } from './indexpattern';

export function toExpression(state: IndexPatternPrivateState) {
  if (state.columnOrder.length === 0) {
    return '';
  }

  const fieldNames = state.columnOrder.map(col => state.columns[col].sourceField);
  const sortedColumns = state.columnOrder.map(col => state.columns[col]);

  const indexName = state.indexPatterns[state.currentIndexPatternId].title;

  if (sortedColumns.every(({ operationType }) => operationType === 'value')) {
    return `esdocs index="${indexName}" fields="${fieldNames.join(', ')}" sort="${
      fieldNames[0]
    }, DESC"`;
  } else if (sortedColumns.length) {
    const aggs = sortedColumns
      .map((col, index) => {
        if (col.operationId === 'date_histogram') {
          return {
            id: fieldNames[index],
            enabled: true,
            type: 'date_histogram',
            schema: 'segment',
            params: {
              field: col.sourceField,
              timeRange: {
                from: 'now-15m',
                to: 'now',
              },
              useNormalizedEsInterval: true,
              interval: 'auto',
              drop_partials: false,
              min_doc_count: 1,
              extended_bounds: {},
            },
          };
        } else if (col.operationId === 'terms') {
          return {
            id: fieldNames[index],
            enabled: true,
            type: 'terms',
            schema: 'segment',
            params: {
              field: col.sourceField,
              orderBy: '1',
              order: 'desc',
              size: 5,
              otherBucket: false,
              otherBucketLabel: 'Other',
              missingBucket: false,
              missingBucketLabel: 'Missing',
            },
          };
        } else if (col.operationId === 'count') {
          return {
            id: fieldNames[index],
            enabled: true,
            type: 'count',
            schema: 'metric',
            params: {},
          };
        } else {
          return {
            id: fieldNames[index],
            enabled: true,
            type: col.operationType,
            schema: 'metric',
            params: {
              field: col.sourceField,
            },
          };
        }
      })
      .map(agg => JSON.stringify(agg));

    return `esaggs
      index="${indexName}"
      metricsAtAllLevels=false
      partialRows=false
      aggConfigs='${aggs.join(',')}'`;
  }

  return '';
}
