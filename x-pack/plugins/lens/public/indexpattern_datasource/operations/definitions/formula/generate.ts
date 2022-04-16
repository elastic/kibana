/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';
import {
  FieldBasedIndexPatternColumn,
  GenericOperationDefinition,
  GenericIndexPatternColumn,
} from '..';
import { BaseIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPatternLayer } from '../../../types';
import { unquotedStringRegex } from './util';
import { isColumnOfType } from '../helpers';
import { StaticValueIndexPatternColumn } from '../static_value';

// Just handle two levels for now
type OperationParams = Record<string, string | number | Record<string, string | number>>;

export function getSafeFieldName({
  sourceField: fieldName,
  operationType,
}: FieldBasedIndexPatternColumn) {
  // return empty for the records field
  if (!fieldName || operationType === 'count') {
    return '';
  }
  if (unquotedStringRegex.test(fieldName)) {
    return `'${fieldName.replaceAll(`'`, "\\'")}'`;
  }
  return fieldName;
}

export function generateFormula(
  previousColumn: ReferenceBasedIndexPatternColumn | GenericIndexPatternColumn,
  layer: IndexPatternLayer,
  previousFormula: string,
  operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined
) {
  if (isColumnOfType<StaticValueIndexPatternColumn>('static_value', previousColumn)) {
    if (previousColumn.params && 'value' in previousColumn.params) {
      return String(previousColumn.params.value); // make sure it's a string
    }
  }
  if ('references' in previousColumn) {
    const metric = layer.columns[previousColumn.references[0]];
    if (metric && 'sourceField' in metric && metric.dataType === 'number') {
      const fieldName = getSafeFieldName(metric);
      // TODO need to check the input type from the definition
      previousFormula += `${previousColumn.operationType}(${metric.operationType}(${fieldName})`;
    }
  } else {
    if (previousColumn && 'sourceField' in previousColumn && previousColumn.dataType === 'number') {
      previousFormula += `${previousColumn.operationType}(${getSafeFieldName(previousColumn)}`;
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

interface ParameterizedColumn extends BaseIndexPatternColumn {
  params: OperationParams;
}

function isParameterizedColumn(col: GenericIndexPatternColumn): col is ParameterizedColumn {
  return Boolean('params' in col && col.params);
}

function extractParamsForFormula(
  column: GenericIndexPatternColumn,
  operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined
) {
  if (!operationDefinitionMap) {
    return [];
  }
  const def = operationDefinitionMap[column.operationType];
  if ('operationParams' in def && isParameterizedColumn(column)) {
    return (def.operationParams || []).flatMap(({ name, required }) => {
      const value = column.params[name];
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
