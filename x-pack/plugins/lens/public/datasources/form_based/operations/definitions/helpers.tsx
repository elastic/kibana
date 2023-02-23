/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IndexPattern, IndexPatternField } from '../../../../types';
import {
  type FieldBasedOperationErrorMessage,
  type GenericIndexPatternColumn,
  operationDefinitionMap,
} from '.';
import {
  FieldBasedIndexPatternColumn,
  FormattedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from './column_types';
import type { FormBasedLayer } from '../../types';
import { hasField } from '../../pure_utils';

export function getInvalidFieldMessage(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern?: IndexPattern
): FieldBasedOperationErrorMessage[] | undefined {
  if (!indexPattern) {
    return;
  }

  const column = layer.columns[columnId] as FieldBasedIndexPatternColumn;
  const { operationType } = column;
  const operationDefinition = operationType ? operationDefinitionMap[operationType] : undefined;
  const fieldNames =
    hasField(column) && operationDefinition
      ? operationDefinition?.getCurrentFields?.(column) ?? [column.sourceField]
      : [];
  const fields = fieldNames.map((fieldName) => indexPattern.getFieldByName(fieldName));
  const filteredFields = fields.filter(Boolean) as IndexPatternField[];

  const isInvalid = Boolean(
    fields.length > filteredFields.length ||
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
    // Missing fields have priority over wrong type
    // This has been moved as some transferable checks also perform exist checks internally and fail eventually
    // but that would make type mismatch error appear in place of missing fields scenarios
    const missingFields = fields
      .map((field, i) => (field ? null : fieldNames[i]))
      .filter(Boolean) as string[];
    if (missingFields.length) {
      return [generateMissingFieldMessage(missingFields, columnId)];
    }
    if (isWrongType) {
      // as fallback show all the fields as invalid?
      const wrongTypeFields =
        operationDefinition?.getNonTransferableFields?.(column, indexPattern) ?? fieldNames;
      return [
        i18n.translate('xpack.lens.indexPattern.fieldsWrongType', {
          defaultMessage:
            '{count, plural, one {Field} other {Fields}} {invalidFields} {count, plural, one {is} other {are}} of the wrong type',
          values: {
            count: wrongTypeFields.length,
            invalidFields: wrongTypeFields.join(', '),
          },
        }),
      ];
    }
  }

  return undefined;
}

export const generateMissingFieldMessage = (
  missingFields: string[],
  columnId: string
): FieldBasedOperationErrorMessage => ({
  message: (
    <FormattedMessage
      id="xpack.lens.indexPattern.fieldsNotFound"
      defaultMessage="{count, plural, one {Field} other {Fields}} {missingFields} {count, plural, one {was} other {were}} not found."
      values={{
        count: missingFields.length,
        missingFields: (
          <>
            {missingFields.map((field, index) => (
              <>
                <strong>{field}</strong>
                {index + 1 === missingFields.length ? '' : ', '}
              </>
            ))}
          </>
        ),
      }}
    />
  ),
  displayLocations: [
    { id: 'toolbar' },
    { id: 'dimensionButton', dimensionId: columnId },
    { id: 'embeddableBadge' },
  ],
});

export function combineErrorMessages(
  errorMessages: Array<FieldBasedOperationErrorMessage[] | undefined>
): FieldBasedOperationErrorMessage[] | undefined {
  const messages = (errorMessages.filter(Boolean) as FieldBasedOperationErrorMessage[][]).flat();
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

export const isColumn = (
  setter:
    | GenericIndexPatternColumn
    | FormBasedLayer
    | ((prevLayer: FormBasedLayer) => FormBasedLayer)
): setter is GenericIndexPatternColumn => {
  return 'operationType' in setter;
};

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
