/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox, EuiButtonGroup, EuiComboBoxOptionOption } from '@elastic/eui';
import { OperationDefinition } from './index';
import { FieldBasedIndexPatternColumn } from './column_types';
import { IndexPatternField, IndexPattern } from '../../types';
import { updateColumnParam } from '../layer_helpers';
import { DataType } from '../../../types';
import { fieldIsInvalid } from '../../utils';

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.lastValueOf', {
    defaultMessage: 'Last value of {name}',
    values: { name },
  });
}

const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export function sortFieldIsInvalid(sortField: string, indexPattern: IndexPattern) {
  const field = indexPattern.getFieldByName(sortField);
  return !(field && field.type === 'date');
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
    sortOrder: 'asc' | 'desc';
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
    indexPattern.getFieldByName(column.sourceField)!.displayName,
  input: 'field',
  onFieldChange: (oldColumn, field) => {
    const newParams = { ...oldColumn.params };

    if ('format' in newParams && field.type !== 'number') {
      delete newParams.format;
    }
    return {
      ...oldColumn,
      dataType: field.type as DataType,
      label: ofName(field.displayName),
      sourceField: field.name,
      params: newParams,
    };
  },
  getPossibleOperationForField: ({ aggregationRestrictions, type }) => {
    if (supportedTypes.has(type) && !aggregationRestrictions) {
      return { dataType: type as DataType, isBucketed: false, scale: 'ordinal' };
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
  hasInvalidReferences(column, indexPattern) {
    return (
      fieldIsInvalid(column, indexPattern) ||
      sortFieldIsInvalid(column.params.sortField, indexPattern)
    );
  },
  buildColumn({ field, previousColumn, indexPattern }) {
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

    const sortOrder =
      (previousColumn?.params &&
        'sortOrder' in previousColumn.params &&
        previousColumn?.params?.sortOrder) ||
      'desc';

    return {
      label: ofName(field.displayName),
      dataType: field.type as DataType,
      operationType: 'last_value',
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      params: {
        sortOrder,
        sortField,
      },
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    schema: 'metric',
    type: 'top_hits',
    params: {
      field: column.sourceField,
      aggregate: 'concat',
      size: 1,
      sortOrder: column.params.sortOrder,
      sortField: column.params.sortField,
    },
  }),

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

  paramEditor: ({ state, setState, currentColumn, layerId }) => {
    const currentIndexPattern = state.indexPatterns[state.layers[layerId].indexPatternId];
    const dateFields = getDateFields(currentIndexPattern);
    const sortOrderButtons = [
      {
        id: `lns-lastValue-ascending`,
        label: 'Ascending',
        value: 'asc',
      },
      {
        id: `lns-lastValue-descending`,
        label: 'Descending',
        value: 'desc',
      },
    ];
    const isSortFieldInvalid = sortFieldIsInvalid(
      currentColumn.params.sortField,
      currentIndexPattern
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
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'sortField',
                  value: choices[0].value,
                })
              );
            }}
            selectedOptions={
              ((currentColumn.params?.sortField
                ? [
                    {
                      label: currentColumn.params.sortField,
                      value: currentColumn.params.sortField,
                    },
                  ]
                : []) as unknown) as EuiComboBoxOptionOption[]
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.lastValue.sortOrder', {
            defaultMessage: 'Sort order',
          })}
          display="columnCompressed"
          fullWidth
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.indexPattern.lastValue.sortOrder', {
              defaultMessage: 'Sort order',
            })}
            buttonSize="compressed"
            data-test-subj="lns-indexPattern-lastValue-sortOrder"
            name="sortOrder"
            options={sortOrderButtons}
            idSelected={
              sortOrderButtons.find(({ value }) => value === currentColumn.params?.sortOrder)!.id
            }
            onChange={(optionId: string) => {
              const value = sortOrderButtons.find(({ id }) => id === optionId)!.value;
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'sortOrder',
                  value,
                })
              );
            }}
          />
        </EuiFormRow>
      </>
    );
  },
};
