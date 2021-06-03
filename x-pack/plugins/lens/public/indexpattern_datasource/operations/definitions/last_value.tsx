/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { AggFunctionsMapping } from '../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { OperationDefinition } from './index';
import { FieldBasedIndexPatternColumn } from './column_types';
import { IndexPatternField, IndexPattern } from '../../types';
import { updateColumnParam } from '../layer_helpers';
import { DataType } from '../../../types';
import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
} from './helpers';
import { adjustTimeScaleLabelSuffix } from '../time_scale_utils';

function ofName(name: string, timeShift: string | undefined) {
  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.lastValueOf', {
      defaultMessage: 'Last value of {name}',
      values: {
        name,
      },
    }),
    undefined,
    undefined,
    undefined,
    timeShift
  );
}

const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export function getInvalidSortFieldMessage(sortField: string, indexPattern?: IndexPattern) {
  if (!indexPattern) {
    return;
  }
  const field = indexPattern.getFieldByName(sortField);
  if (!field) {
    return i18n.translate('xpack.lens.indexPattern.lastValue.sortFieldNotFound', {
      defaultMessage: 'Field {invalidField} was not found',
      values: { invalidField: sortField },
    });
  }
  if (field.type !== 'date') {
    return i18n.translate('xpack.lens.indexPattern.lastValue.invalidTypeSortField', {
      defaultMessage: 'Field {invalidField} is not a date field and cannot be used for sorting',
      values: { invalidField: sortField },
    });
  }
}

function isTimeFieldNameDateField(indexPattern: IndexPattern) {
  return (
    indexPattern.timeFieldName &&
    indexPattern.fields.find(
      (field) => field.name === indexPattern.timeFieldName && field.type === 'date'
    )
  );
}

function getDateFields(indexPattern: IndexPattern): IndexPatternField[] {
  const dateFields = indexPattern.fields.filter((field) => field.type === 'date');
  if (isTimeFieldNameDateField(indexPattern)) {
    dateFields.sort(({ name: nameA }, { name: nameB }) => {
      if (nameA === indexPattern.timeFieldName) {
        return -1;
      }
      if (nameB === indexPattern.timeFieldName) {
        return 1;
      }
      return 0;
    });
  }
  return dateFields;
}

export interface LastValueIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'last_value';
  params: {
    sortField: string;
    // last value on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export const lastValueOperation: OperationDefinition<LastValueIndexPatternColumn, 'field'> = {
  type: 'last_value',
  displayName: i18n.translate('xpack.lens.indexPattern.lastValue', {
    defaultMessage: 'Last value',
  }),
  getDefaultLabel: (column, indexPattern) =>
    ofName(getSafeName(column.sourceField, indexPattern), column.timeShift),
  input: 'field',
  onFieldChange: (oldColumn, field) => {
    const newParams = { ...oldColumn.params };

    if ('format' in newParams && field.type !== 'number') {
      delete newParams.format;
    }
    return {
      ...oldColumn,
      dataType: field.type as DataType,
      label: ofName(field.displayName, oldColumn.timeShift),
      sourceField: field.name,
      params: newParams,
      scale: field.type === 'string' ? 'ordinal' : 'ratio',
    };
  },
  getPossibleOperationForField: ({ aggregationRestrictions, type }) => {
    if (supportedTypes.has(type) && !aggregationRestrictions) {
      return {
        dataType: type as DataType,
        isBucketed: false,
        scale: type === 'string' ? 'ordinal' : 'ratio',
      };
    }
  },
  getDisabledStatus(indexPattern: IndexPattern) {
    const hasDateFields = indexPattern && getDateFields(indexPattern).length;
    if (!hasDateFields) {
      return i18n.translate('xpack.lens.indexPattern.lastValue.disabled', {
        defaultMessage: 'This function requires the presence of a date field in your index',
      });
    }
  },
  getErrorMessage(layer, columnId, indexPattern) {
    const column = layer.columns[columnId] as LastValueIndexPatternColumn;
    let errorMessages: string[] = [];
    const invalidSourceFieldMessage = getInvalidFieldMessage(column, indexPattern);
    const invalidSortFieldMessage = getInvalidSortFieldMessage(
      column.params.sortField,
      indexPattern
    );
    if (invalidSourceFieldMessage) {
      errorMessages = [...invalidSourceFieldMessage];
    }
    if (invalidSortFieldMessage) {
      errorMessages = [invalidSortFieldMessage];
    }
    return errorMessages.length ? errorMessages : undefined;
  },
  buildColumn({ field, previousColumn, indexPattern }, columnParams) {
    const sortField = isTimeFieldNameDateField(indexPattern)
      ? indexPattern.timeFieldName
      : indexPattern.fields.find((f) => f.type === 'date')?.name;

    if (!sortField) {
      throw new Error(
        i18n.translate('xpack.lens.functions.lastValue.missingSortField', {
          defaultMessage: 'This index pattern does not contain any date fields',
        })
      );
    }

    return {
      label: ofName(field.displayName, previousColumn?.timeShift),
      dataType: field.type as DataType,
      operationType: 'last_value',
      isBucketed: false,
      scale: field.type === 'string' ? 'ordinal' : 'ratio',
      sourceField: field.name,
      filter: getFilter(previousColumn, columnParams),
      timeShift: previousColumn?.timeShift,
      params: {
        sortField,
        ...getFormatFromPreviousColumn(previousColumn),
      },
    };
  },
  filterable: true,
  shiftable: true,
  toEsAggsFn: (column, columnId) => {
    return buildExpressionFunction<AggFunctionsMapping['aggTopHit']>('aggTopHit', {
      id: columnId,
      enabled: true,
      schema: 'metric',
      field: column.sourceField,
      aggregate: 'concat',
      size: 1,
      sortOrder: 'desc',
      sortField: column.params.sortField,
      // time shift is added to wrapping aggFilteredMetric if filter is set
      timeShift: column.filter ? undefined : column.timeShift,
    }).toAst();
  },

  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);
    const newTimeField = newIndexPattern.getFieldByName(column.params.sortField);
    return Boolean(
      newField &&
        newField.type === column.dataType &&
        !newField.aggregationRestrictions &&
        newTimeField?.type === 'date'
    );
  },

  paramEditor: ({ layer, updateLayer, columnId, currentColumn, indexPattern }) => {
    const dateFields = getDateFields(indexPattern);
    const isSortFieldInvalid = !!getInvalidSortFieldMessage(
      currentColumn.params.sortField,
      indexPattern
    );
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.lastValue.sortField', {
            defaultMessage: 'Sort by date field',
          })}
          display="columnCompressed"
          fullWidth
          error={i18n.translate('xpack.lens.indexPattern.sortField.invalid', {
            defaultMessage: 'Invalid field. Check your index pattern or pick another field.',
          })}
          isInvalid={isSortFieldInvalid}
        >
          <EuiComboBox
            placeholder={i18n.translate('xpack.lens.indexPattern.lastValue.sortFieldPlaceholder', {
              defaultMessage: 'Sort field',
            })}
            compressed
            isClearable={false}
            data-test-subj="lns-indexPattern-lastValue-sortField"
            isInvalid={isSortFieldInvalid}
            singleSelection={{ asPlainText: true }}
            aria-label={i18n.translate('xpack.lens.indexPattern.lastValue.sortField', {
              defaultMessage: 'Sort by date field',
            })}
            options={dateFields?.map((field: IndexPatternField) => {
              return {
                value: field.name,
                label: field.displayName,
              };
            })}
            onChange={(choices) => {
              if (choices.length === 0) {
                return;
              }
              updateLayer(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'sortField',
                  value: choices[0].value,
                })
              );
            }}
            selectedOptions={
              ((currentColumn.params?.sortField
                ? [
                    {
                      label:
                        indexPattern.getFieldByName(currentColumn.params.sortField)?.displayName ||
                        currentColumn.params.sortField,
                      value: currentColumn.params.sortField,
                    },
                  ]
                : []) as unknown) as EuiComboBoxOptionOption[]
            }
          />
        </EuiFormRow>
      </>
    );
  },
};
