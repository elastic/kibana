/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { IndexPatternColumn, operationDefinitionMap } from '.';
import { FieldBasedIndexPatternColumn } from './column_types';
import { IndexPattern } from '../../types';

export const useDebounceWithOptions = (
  fn: Function,
  { skipFirstRender }: { skipFirstRender: boolean } = { skipFirstRender: false },
  ms?: number | undefined,
  deps?: React.DependencyList | undefined
) => {
  const isFirstRender = useRef(true);
  const newDeps = [...(deps || []), isFirstRender];

  return useDebounce(
    () => {
      if (skipFirstRender && isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      return fn();
    },
    ms,
    newDeps
  );
};

export function getInvalidFieldMessage(
  column: FieldBasedIndexPatternColumn,
  indexPattern?: IndexPattern
) {
  if (!indexPattern) {
    return;
  }
  const { sourceField, operationType } = column;
  const field = sourceField ? indexPattern.getFieldByName(sourceField) : undefined;
  const operationDefinition = operationType && operationDefinitionMap[operationType];

  const isInvalid = Boolean(
    sourceField &&
      operationDefinition &&
      !(
        field &&
        operationDefinition?.input === 'field' &&
        operationDefinition.getPossibleOperationForField(field) !== undefined
      )
  );
  return isInvalid
    ? [
        i18n.translate('xpack.lens.indexPattern.fieldNotFound', {
          defaultMessage: 'Field {invalidField} was not found',
          values: { invalidField: sourceField },
        }),
      ]
    : undefined;
}

export function getEsAggsSuffix(column: IndexPatternColumn) {
  const operationDefinition = operationDefinitionMap[column.operationType];
  return operationDefinition.input === 'field' && operationDefinition.getEsAggsSuffix
    ? operationDefinition.getEsAggsSuffix(column)
    : '';
}

export function getSafeName(name: string, indexPattern: IndexPattern): string {
  const field = indexPattern.getFieldByName(name);
  return field
    ? field.displayName
    : i18n.translate('xpack.lens.indexPattern.missingFieldLabel', {
        defaultMessage: 'Missing field',
      });
}

export function isValidNumber(
  inputValue: string | number | null | undefined,
  integer?: boolean,
  upperBound?: number,
  lowerBound?: number
) {
  const inputValueAsNumber = Number(inputValue);
  return (
    inputValue !== '' &&
    inputValue !== null &&
    inputValue !== undefined &&
    !Number.isNaN(inputValueAsNumber) &&
    Number.isFinite(inputValueAsNumber) &&
    (!integer || Number.isInteger(inputValueAsNumber)) &&
    (upperBound === undefined || inputValueAsNumber <= upperBound) &&
    (lowerBound === undefined || inputValueAsNumber >= lowerBound)
  );
}
