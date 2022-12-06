/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';
import { DOCUMENT_FIELD_NAME } from '../../../../../../common';
import {
  FieldBasedIndexPatternColumn,
  GenericOperationDefinition,
  GenericIndexPatternColumn,
} from '..';
import { BaseIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { FormBasedLayer } from '../../../types';
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
  if (!fieldName || (operationType === 'count' && fieldName === DOCUMENT_FIELD_NAME)) {
    return '';
  }
  if (unquotedStringRegex.test(fieldName)) {
    return `'${fieldName.replaceAll(`'`, "\\'")}'`;
  }
  return fieldName;
}

export function generateFormula(
  previousColumn: ReferenceBasedIndexPatternColumn | GenericIndexPatternColumn,
  layer: FormBasedLayer,
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
    if (
      previousColumn &&
      'sourceField' in previousColumn &&
      (previousColumn.dataType === 'number' || previousColumn.dataType === 'date')
    ) {
      previousFormula += `${previousColumn.operationType}(${getSafeFieldName(previousColumn)}`;
    } else {
      // couldn't find formula function to call, exit early because adding args is going to fail anyway
      return '';
    }
  }
  const formulaNamedArgs = extractParamsForFormula(previousColumn, operationDefinitionMap);
  if (formulaNamedArgs.length) {
    previousFormula +=
      ', ' + formulaNamedArgs.map(({ name, value }) => `${name}=${value}`).join(', ');
  }
  if (previousColumn.filter) {
    if (
      previousColumn.operationType !== 'count' ||
      ('sourceField' in previousColumn && previousColumn.sourceField !== DOCUMENT_FIELD_NAME)
    ) {
      previousFormula += ', ';
    }
    previousFormula +=
      (previousColumn.filter.language === 'kuery' ? 'kql=' : 'lucene=') +
      `'${previousColumn.filter.query.replace(/'/g, `\\'`)}'`; // replace all
  }
  if (previousColumn.timeShift) {
    if (
      previousColumn.operationType !== 'count' ||
      ('sourceField' in previousColumn && previousColumn.sourceField !== DOCUMENT_FIELD_NAME) ||
      previousColumn.filter
    ) {
      previousFormula += ', ';
    }
    previousFormula += `shift='${previousColumn.timeShift}'`;
  }
  if (previousColumn.reducedTimeRange) {
    if (
      previousColumn.operationType !== 'count' ||
      previousColumn.filter ||
      previousColumn.timeShift
    ) {
      previousFormula += ', ';
    }
    previousFormula += `reducedTimeRange='${previousColumn.reducedTimeRange}'`;
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
