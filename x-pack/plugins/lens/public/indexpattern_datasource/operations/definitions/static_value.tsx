/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiFormLabel, EuiSpacer } from '@elastic/eui';
import { OperationDefinition } from './index';
import { ReferenceBasedIndexPatternColumn } from './column_types';
import type { IndexPattern } from '../../types';
import { useDebouncedValue } from '../../../shared_components';
import { getFormatFromPreviousColumn, isValidNumber } from './helpers';

const defaultLabel = i18n.translate('xpack.lens.indexPattern.staticValueLabelDefault', {
  defaultMessage: 'Static value',
});

const defaultValue = 100;

function isEmptyValue(value: number | string | undefined) {
  return value == null || value === '';
}

function ofName(value: number | string | undefined) {
  if (isEmptyValue(value)) {
    return defaultLabel;
  }
  return i18n.translate('xpack.lens.indexPattern.staticValueLabelWithValue', {
    defaultMessage: 'Static value: {value}',
    values: { value },
  });
}

export interface StaticValueIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'static_value';
  params: {
    value?: string;
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export const staticValueOperation: OperationDefinition<
  StaticValueIndexPatternColumn,
  'managedReference'
> = {
  type: 'static_value',
  displayName: defaultLabel,
  getDefaultLabel: (column) => ofName(column.params.value),
  input: 'managedReference',
  hidden: true,
  getDisabledStatus(indexPattern: IndexPattern) {
    return undefined;
  },
  getErrorMessage(layer, columnId) {
    const column = layer.columns[columnId] as StaticValueIndexPatternColumn;
    if (!column.params.value) {
      return;
    }

    return !isValidNumber(column.params.value)
      ? [
          i18n.translate('xpack.lens.indexPattern.staticValueError', {
            defaultMessage: 'The static value of {value} is not a valid number',
            values: { value: column.params.value },
          }),
        ]
      : undefined;
  },
  getPossibleOperation() {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  toExpression: (layer, columnId) => {
    const currentColumn = layer.columns[columnId] as StaticValueIndexPatternColumn;
    const params = currentColumn.params;
    // TODO: improve this logic
    const useDisplayLabel = currentColumn.label !== defaultLabel;
    const label = isValidNumber(params.value)
      ? useDisplayLabel
        ? currentColumn.label
        : params?.value ?? defaultLabel
      : defaultLabel;

    return [
      {
        type: 'function',
        function: isValidNumber(params.value) ? 'mathColumn' : 'mapColumn',
        arguments: {
          id: [columnId],
          name: [label || defaultLabel],
          expression: [isValidNumber(params.value) ? params.value! : String(defaultValue)],
        },
      },
    ];
  },
  buildColumn({ previousColumn, layer, indexPattern }, columnParams, operationDefinitionMap) {
    const existingStaticValue =
      previousColumn?.operationType === 'static_value' &&
      previousColumn.params &&
      'value' in previousColumn.params
        ? previousColumn.params.value
        : undefined;
    const previousParams: StaticValueIndexPatternColumn['params'] = {
      ...{ value: existingStaticValue },
      ...getFormatFromPreviousColumn(previousColumn),
      ...columnParams,
    };
    return {
      label: ofName(previousParams.value),
      dataType: 'number',
      operationType: 'static_value',
      isBucketed: false,
      scale: 'ratio',
      params: { ...previousParams, value: previousParams.value ?? String(defaultValue) },
      references: [],
    };
  },
  isTransferable: () => {
    return true;
  },
  createCopy(layer, sourceId, targetId, indexPattern, operationDefinitionMap) {
    const currentColumn = layer.columns[sourceId] as StaticValueIndexPatternColumn;
    return {
      ...layer,
      columns: {
        ...layer.columns,
        [targetId]: { ...currentColumn },
      },
    };
  },

  paramEditor: function StaticValueEditor({
    layer,
    updateLayer,
    currentColumn,
    columnId,
    activeData,
    layerId,
    indexPattern,
  }) {
    const onChange = useCallback(
      (newValue) => {
        // even if debounced it's triggering for empty string with the previous valid value
        if (currentColumn.params.value === newValue) {
          return;
        }
        updateLayer({
          ...layer,
          columns: {
            ...layer.columns,
            [columnId]: {
              ...currentColumn,
              label: currentColumn?.customLabel ? currentColumn.label : ofName(newValue),
              params: {
                ...currentColumn.params,
                value: newValue,
              },
            },
          },
        });
      },
      [layer, currentColumn, columnId, updateLayer]
    );

    const { inputValue, handleInputChange } = useDebouncedValue<string | undefined>(
      {
        value: currentColumn?.params?.value || String(defaultValue),
        onChange,
      },
      { allowFalsyValue: true }
    );

    const onChangeHandler = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value;
        handleInputChange(isValidNumber(value) ? value : undefined);
      },
      [handleInputChange]
    );

    return (
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--padded lnsIndexPatternDimensionEditor__section--shaded">
        <EuiFormLabel>
          {i18n.translate('xpack.lens.indexPattern.staticValue.label', {
            defaultMessage: 'Threshold value',
          })}
        </EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiFieldNumber
          data-test-subj="lns-indexPattern-static_value-input"
          compressed
          value={inputValue ?? ''}
          onChange={onChangeHandler}
        />
      </div>
    );
  },
};
