/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GenericIndexPatternColumn, operationDefinitionMap } from '.';
import {
  FieldBasedIndexPatternColumn,
  FormattedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from './column_types';
import { IndexPattern, IndexPatternField } from '../../types';
import { hasField } from '../../pure_utils';

export function getInvalidFieldMessage(
  column: FieldBasedIndexPatternColumn,
  indexPattern?: IndexPattern
) {
  if (!indexPattern) {
    return;
  }
  const { operationType } = column;
  const operationDefinition = operationType ? operationDefinitionMap[operationType] : undefined;
  const fieldNames =
    hasField(column) && operationDefinition
      ? operationDefinition?.getCurrentFields?.(column) ?? [column.sourceField]
      : undefined;
  const fields = fieldNames?.length
    ? fieldNames.map((fieldName) => indexPattern.getFieldByName(fieldName))
    : undefined;
  const filteredFields = (fields?.filter(Boolean) ?? []) as IndexPatternField[];

  const isInvalid = Boolean(
    filteredFields.length &&
      !(
        operationDefinition?.input === 'field' &&
        filteredFields.every(
          (field) => operationDefinition.getPossibleOperationForField(field) != null
        )
      )
  );

  const isWrongType = Boolean(
    filteredFields.length &&
      !operationDefinition?.isTransferable(
        column as GenericIndexPatternColumn,
        indexPattern,
        operationDefinitionMap
      )
  );
  if (isInvalid) {
    if (isWrongType) {
      // as fallback show all the fields as invalid?
      const wrongTypeFields =
        operationDefinition?.getNonTransferableFields?.(column, indexPattern) ??
        filteredFields.map((field) => field.displayName);

      if (wrongTypeFields.length > 1) {
        return [
          i18n.translate('xpack.lens.indexPattern.fieldsWrongType', {
            defaultMessage: 'Fields {invalidFields} are of the wrong type',
            values: {
              invalidFields: wrongTypeFields.join(', '),
            },
          }),
        ];
      }
      return [
        i18n.translate('xpack.lens.indexPattern.fieldWrongType', {
          defaultMessage: 'Field {invalidField} is of the wrong type',
          values: {
            invalidField: wrongTypeFields[0],
          },
        }),
      ];
    }
    if (fieldNames && fieldNames.length > 1) {
      return [
        i18n.translate('xpack.lens.indexPattern.fieldNotFound', {
          defaultMessage: 'Fields {invalidFields} were not found',
          values: {
            invalidFields: fieldNames
              ?.map((fieldName, i) => (!fields?.[i] ? fieldName : null))
              .filter(Boolean)
              .join(', '),
          },
        }),
      ];
    }
    return [
      i18n.translate('xpack.lens.indexPattern.fieldNotFound', {
        defaultMessage: 'Field {invalidField} was not found',
        values: { invalidField: filteredFields[0].displayName },
      }),
    ];
  }

  return undefined;
}

export function combineErrorMessages(
  errorMessages: Array<string[] | undefined>
): string[] | undefined {
  const messages = (errorMessages.filter(Boolean) as string[][]).flat();
  return messages.length ? messages : undefined;
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

export function isColumnOfType<C extends GenericIndexPatternColumn>(
  type: C['operationType'],
  column: GenericIndexPatternColumn
): column is C {
  return column.operationType === type;
}

export function isColumnFormatted(
  column: GenericIndexPatternColumn
): column is FormattedIndexPatternColumn {
  return Boolean(
    'params' in column &&
      (column as FormattedIndexPatternColumn).params &&
      'format' in (column as FormattedIndexPatternColumn).params!
  );
}

export function getFormatFromPreviousColumn(
  previousColumn: GenericIndexPatternColumn | ReferenceBasedIndexPatternColumn | undefined
) {
  return previousColumn?.dataType === 'number' &&
    isColumnFormatted(previousColumn) &&
    previousColumn.params
    ? { format: previousColumn.params.format }
    : undefined;
}

export function getFilter(
  previousColumn: GenericIndexPatternColumn | undefined,
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
