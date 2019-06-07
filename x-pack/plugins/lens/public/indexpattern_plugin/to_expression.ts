/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { IndexPatternPrivateState } from './indexpattern';

export function toExpression(state: IndexPatternPrivateState) {
  if (state.columnOrder.length === 0) {
    return null;
  }

  const fieldNames = state.columnOrder.map(col => state.columns[col].sourceField);
  const sortedColumns = state.columnOrder.map(col => state.columns[col]);

  const indexName = state.indexPatterns[state.currentIndexPatternId].title;

  if (sortedColumns.every(({ operationType }) => operationType === 'value')) {
    const idMap = fieldNames.reduce(
      (currentIdMap, fieldName, index) => ({
        ...currentIdMap,
        [fieldName]: state.columnOrder[index],
      }),
      {} as Record<string, string>
    );
    return `esdocs index="${indexName}" fields="${fieldNames.join(', ')}" sort="${
      fieldNames[0]
    }, DESC" | lens_rename_columns idMap='${JSON.stringify(idMap)}'`;
  } else if (sortedColumns.length) {
    const aggs = sortedColumns
      .map((col, index) => {
        if (col.operationType === 'date_histogram') {
          return {
            id: state.columnOrder[index],
            enabled: true,
            type: 'date_histogram',
            schema: 'segment',
            params: {
              field: col.sourceField,
              timeRange: {
                from: 'now-1d',
                to: 'now',
              },
              useNormalizedEsInterval: true,
              interval: '1h',
              drop_partials: false,
              min_doc_count: 1,
              extended_bounds: {},
            },
          };
        } else if (col.operationType === 'terms') {
          return {
            id: state.columnOrder[index],
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
        } else if (col.operationType === 'count') {
          return {
            id: state.columnOrder[index],
            enabled: true,
            type: 'count',
            schema: 'metric',
            params: {},
          };
        } else {
          return {
            id: state.columnOrder[index],
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

    const idMap = state.columnOrder.reduce(
      (currentIdMap, columnId, index) => ({
        ...currentIdMap,
        [`col-${index}-${columnId}`]: columnId,
      }),
      {} as Record<string, string>
    );

    return `esaggs
      index="${state.currentIndexPatternId}"
      metricsAtAllLevels="false"
      partialRows="false"
      aggConfigs='[${aggs.join(',')}]' | lens_rename_columns idMap='${JSON.stringify(idMap)}'`;
  }

  return null;
}
