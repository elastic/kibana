/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { IndexPatternPrivateState, IndexPatternColumn } from './indexpattern';
import { operationDefinitionMap, OperationDefinition } from './operations';

export function toExpression(state: IndexPatternPrivateState) {
  if (state.columnOrder.length === 0) {
    return null;
  }

  const sortedColumns = state.columnOrder.map(col => state.columns[col]);

  const indexName = state.indexPatterns[state.currentIndexPatternId].title;

  function getEsAggsConfig<C extends IndexPatternColumn>(column: C, columnId: string) {
    // Typescript is not smart enough to infer that definitionMap[C['operationType']] is always OperationDefinition<C>,
    // but this is made sure by the typing in operations/index.ts
    const operationDefinition = (operationDefinitionMap[
      column.operationType
    ] as unknown) as OperationDefinition<C>;
    return operationDefinition.toEsAggsConfig(column, columnId);
  }

  if (sortedColumns.every(({ operationType }) => operationType === 'value')) {
    const fieldNames = sortedColumns.map(column =>
      'sourceField' in column ? column.sourceField : undefined
    );

    return `esdocs index="${indexName}" fields="${fieldNames.join(', ')}" sort="${
      fieldNames[0]
    }, DESC"`;
  } else if (sortedColumns.length) {
    const aggs = sortedColumns.map((col, index) => {
      return getEsAggsConfig(col, state.columnOrder[index]);
    });

    return `esaggs
      index="${state.currentIndexPatternId}"
      metricsAtAllLevels="false"
      partialRows="false"
      aggConfigs='${JSON.stringify(aggs)}'`;
  }

  return '';
}
