/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IndexPatternColumn, operationDefinitionMap } from '.';
import { FieldBasedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from './column_types';
import { IndexPattern } from '../../types';

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

  const isWrongType = Boolean(
    sourceField &&
      operationDefinition &&
      field &&
      !operationDefinition.isTransferable(
        column as IndexPatternColumn,
        indexPattern,
        operationDefinitionMap
      )
  );
  if (isInvalid) {
    if (isWrongType) {
      return [
        i18n.translate('xpack.lens.indexPattern.fieldWrongType', {
          defaultMessage: 'Field {invalidField} is of the wrong type',
          values: {
            invalidField: sourceField,
          },
        }),
      ];
    }
    return [
      i18n.translate('xpack.lens.indexPattern.fieldNotFound', {
        defaultMessage: 'Field {invalidField} was not found',
        values: { invalidField: sourceField },
      }),
    ];
  }

  return undefined;
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
    inputValue != null &&
    !Number.isNaN(inputValueAsNumber) &&
    Number.isFinite(inputValueAsNumber) &&
    (!integer || Number.isInteger(inputValueAsNumber)) &&
    (upperBound === undefined || inputValueAsNumber <= upperBound) &&
    (lowerBound === undefined || inputValueAsNumber >= lowerBound)
  );
}

export function getFormatFromPreviousColumn(
  previousColumn: IndexPatternColumn | ReferenceBasedIndexPatternColumn | undefined
) {
  return previousColumn?.dataType === 'number' &&
    previousColumn.params &&
    'format' in previousColumn.params &&
    previousColumn.params.format
    ? { format: previousColumn.params.format }
    : undefined;
}

export function getFilter(
  previousColumn: IndexPatternColumn | undefined,
  columnParams: { kql?: string | undefined; lucene?: string | undefined } | undefined
) {
  let filter = previousColumn?.filter;
  if (columnParams) {
    if ('kql' in columnParams) {
      filter = { query: columnParams.kql ?? '', language: 'kuery' };
    } else if ('lucene' in columnParams) {
      filter = { query: columnParams.lucene ?? '', language: 'lucene' };
    }
  }
  return filter;
}
