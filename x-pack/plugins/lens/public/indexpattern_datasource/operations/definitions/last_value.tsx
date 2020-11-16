/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { OperationDefinition } from './index';
import { FieldBasedIndexPatternColumn } from './column_types';
import { IndexPatternField, IndexPattern } from '../../types';
import { updateColumnParam } from '../layer_helpers';
import { DataType } from '../../../types';

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.lastValueOf', {
    defaultMessage: 'Last value of {name}',
    values: { name },
  });
}

const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

function getDateFields(indexPattern: IndexPattern): IndexPatternField[] {
  if (indexPattern.timeFieldName) {
    return [
      ...indexPattern.fields.filter((field) => field.name === indexPattern.timeFieldName),
      ...indexPattern.fields.filter(
        (field) => field.type === 'date' && indexPattern.timeFieldName !== field.name
      ),
    ];
  } else {
    return indexPattern.fields.filter((field) => field.type === 'date');
  }
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
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (supportedTypes.has(type)) {
      return { dataType: type as DataType, isBucketed: false, scale: 'ordinal' };
    }
  },
  buildColumn({ field, previousColumn, indexPattern }) {
    console.log(indexPattern);
    return {
      label: ofName(field.displayName),
      dataType: 'number',
      operationType: 'last_value',
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      params: {
        sortOrder:
          (previousColumn?.params &&
            'sortOrder' in previousColumn.params &&
            previousColumn?.params?.sortOrder) ||
          'desc',
        sortField:
          indexPattern.timeFieldName ||
          indexPattern.fields.filter((field) => field.type === 'date')[0] ||
          field.name,
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
      sortOrder: column.params?.sortOrder,
      sortField: column.params.sortField,
    },
  }),

  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);
    return Boolean(newField && newField.type === 'number');
  },

  paramEditor: ({ state, setState, currentColumn, layerId }) => {
    const dateFields = getDateFields(state.indexPatterns[state.layers[layerId].indexPatternId]);
    if (!dateFields.length) {
    }
    // console.log(state.indexPatterns[state.layers[layerId].indexPatternId]);
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.lastValue.sortOrder', {
            defaultMessage: 'Get first value',
          })}
          display="columnCompressedSwitch"
        >
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.lens.indexPattern.lastValue.sortOrder', {
              defaultMessage: 'Get first value',
            })}
            showLabel={false}
            data-test-subj="indexPattern-lastValue-switch"
            name="lastValueSwitch"
            checked={currentColumn.params?.sortOrder === 'desc'}
            onChange={() => {
              console.log('chlen');
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'sortOrder',
                  value: currentColumn.params?.sortOrder === 'desc' ? 'asc' : 'desc',
                })
              );
            }}
          />
        </EuiFormRow>
        {dateFields.length ? (
          <EuiFormRow
            label={i18n.translate('xpack.lens.indexPattern.lastValue.sortField', {
              defaultMessage: 'Sort on',
            })}
            display="columnCompressed"
            fullWidth
          >
            <EuiSelect
              compressed
              data-test-subj="indexPattern-lastValue-sortField"
              options={dateFields?.map((field: IndexPatternField) => {
                return {
                  value: field.name,
                  text: field.displayName,
                };
              })}
              value={currentColumn.params.sortField}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setState(
                  updateColumnParam({
                    state,
                    layerId,
                    currentColumn,
                    paramName: 'sortField',
                    value: e.target.value,
                  })
                )
              }
              aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
                defaultMessage: 'Order by',
              })}
            />
          </EuiFormRow>
        ) : null}
      </>
    );
  },
};
