/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';
import { GenericOperationDefinition, IndexPatternColumn } from '../index';
import { ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPatternLayer } from '../../../types';

// Just handle two levels for now
type OperationParams = Record<string, string | number | Record<string, string | number>>;

export function getSafeFieldName(fieldName: string | undefined) {
  // clean up the "Records" field for now
  if (!fieldName || fieldName === 'Records') {
    return '';
  }
  return fieldName;
}

export function generateFormula(
  previousColumn: ReferenceBasedIndexPatternColumn | IndexPatternColumn,
  layer: IndexPatternLayer,
  previousFormula: string,
  operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined
) {
  if ('references' in previousColumn) {
    const metric = layer.columns[previousColumn.references[0]];
    if (metric && 'sourceField' in metric && metric.dataType === 'number') {
      const fieldName = getSafeFieldName(metric.sourceField);
      // TODO need to check the input type from the definition
      previousFormula += `${previousColumn.operationType}(${metric.operationType}(${fieldName})`;
    }
  } else {
    if (previousColumn && 'sourceField' in previousColumn && previousColumn.dataType === 'number') {
      previousFormula += `${previousColumn.operationType}(${getSafeFieldName(
        previousColumn?.sourceField
      )}`;
    }
  }
  const formulaNamedArgs = extractParamsForFormula(previousColumn, operationDefinitionMap);
  if (formulaNamedArgs.length) {
    previousFormula +=
      ', ' + formulaNamedArgs.map(({ name, value }) => `${name}=${value}`).join(', ');
  }
  if (previousColumn.filter) {
    if (previousColumn.operationType !== 'count') {
      previousFormula += ', ';
    }
    previousFormula +=
      (previousColumn.filter.language === 'kuery' ? 'kql=' : 'lucene=') +
      `'${previousColumn.filter.query.replace(/'/g, `\\'`)}'`; // replace all
  }
  if (previousColumn.timeShift) {
    if (previousColumn.operationType !== 'count' || previousColumn.filter) {
      previousFormula += ', ';
    }
    previousFormula += `shift='${previousColumn.timeShift}'`;
  }
  if (previousFormula) {
    // close the formula at the end
    previousFormula += ')';
  }
  return previousFormula;
}

function extractParamsForFormula(
  column: IndexPatternColumn | ReferenceBasedIndexPatternColumn,
  operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined
) {
  if (!operationDefinitionMap) {
    return [];
  }
  const def = operationDefinitionMap[column.operationType];
  if ('operationParams' in def && column.params) {
    return (def.operationParams || []).flatMap(({ name, required }) => {
      const value = (column.params as OperationParams)![name];
      if (isObject(value)) {
        return Object.keys(value).map((subName) => ({
          name: `${name}-${subName}`,
          value: value[subName] as string | number,
          required,
        }));
      }
      return {
        name,
        value,
        required,
      };
    });
  }
  return [];
}
