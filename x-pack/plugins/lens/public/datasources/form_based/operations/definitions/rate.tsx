/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { AggFunctionsMapping } from '@kbn/data-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { useCallback } from 'react';
import { useDebouncedValue } from '../../../../shared_components';
import { OperationDefinition } from '.';
import { FieldBasedIndexPatternColumn, ValueFormatConfig } from './column_types';

import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
  combineErrorMessages,
  isMetricCounterField,
} from './helpers';

const supportedTypes = new Set(['number']);

const SCALE = 'ratio';
const OPERATION_TYPE = 'rate';
const IS_BUCKETED = false;

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.rateOf', {
    defaultMessage: 'Rate of {name}',
    values: {
      name,
    },
  });
}

type AggregateFnTypes = 'aggBucketSum' | 'aggBucketMax' | 'aggBucketMin' | 'aggBucketAvg';

export interface RateIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof OPERATION_TYPE;
  params?: {
    format?: ValueFormatConfig;
    aggregateFn: AggregateFnTypes;
  };
}

export const rateOperation: OperationDefinition<RateIndexPatternColumn, 'field', {}, true> = {
  type: OPERATION_TYPE,
  displayName: i18n.translate('xpack.lens.indexPattern.rate', {
    defaultMessage: 'Rate',
  }),
  allowAsReference: true,
  input: 'field',
  operationParams: [
    { name: 'aggregateFn', type: 'string', required: false, defaultValue: 'aggBucketMax' },
  ],
  getPossibleOperationForField: ({
    aggregationRestrictions,
    aggregatable,
    type,
    timeSeriesMetric,
  }) => {
    if (supportedTypes.has(type) && aggregatable) {
      return { dataType: 'number', isBucketed: IS_BUCKETED, scale: SCALE };
    }
  },
  getErrorMessage: (layer, columnId, indexPattern) =>
    combineErrorMessages([getInvalidFieldMessage(layer, columnId, indexPattern)]),
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        isMetricCounterField(newField) &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.rate)
    );
  },
  filterable: true,
  shiftable: true,
  canReduceTimeRange: true,
  getDefaultLabel: (column, indexPattern) => ofName(getSafeName(column.sourceField, indexPattern)),
  buildColumn({ field, previousColumn }, columnParams) {
    return {
      label: ofName(field.displayName),
      dataType: 'number',
      operationType: OPERATION_TYPE,
      scale: SCALE,
      sourceField: field.name,
      isBucketed: IS_BUCKETED,
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      reducedTimeRange: columnParams?.reducedTimeRange || previousColumn?.reducedTimeRange,
      params: {
        aggregateFn: 'aggBucketMax',
        ...getFormatFromPreviousColumn(previousColumn),
      },
    };
  },
  toEsAggsFn: (column, columnId, indexPattern) => {
    const aggFn = column.params?.aggregateFn || 'aggBucketMax';
    if (indexPattern.getFieldByName(column.sourceField)?.timeSeriesMetric === 'counter') {
      // if wrap in timeseries and bucket agg
      return buildExpressionFunction(aggFn, {
        id: columnId,
        enabled: true,
        schema: 'metric',
        customBucket: buildExpression([
          buildExpressionFunction<AggFunctionsMapping['aggTimeSeries']>('aggTimeSeries', {
            id: `-timeseries`,
            enabled: true,
            schema: 'bucket',
          }),
        ]),
        customMetric: buildExpression([
          buildExpressionFunction<AggFunctionsMapping['aggRate']>('aggRate', {
            id: '-metric',
            enabled: true,
            schema: 'metric',
            field: column.sourceField,
            // time shift is added to wrapping aggFilteredMetric if filter is set
            timeShift: column.filter ? undefined : column.timeShift,
            unit: 'second',
          }),
        ]),
      }).toAst();
    } else {
      return buildExpressionFunction(aggFn, {
        id: columnId,
        enabled: true,
        schema: 'metric',
        customBucket: buildExpression([
          buildExpressionFunction<AggFunctionsMapping['aggDateHistogram']>('aggDateHistogram', {
            id: `-datehistogram`,
            enabled: true,
            schema: 'bucket',
            field: '@timestamp',
            interval: '1d',
          }),
        ]),
        customMetric: buildExpression([
          buildExpressionFunction<AggFunctionsMapping['aggRate']>('aggRate', {
            id: '-metric',
            enabled: true,
            schema: 'metric',
            field: column.sourceField,
            // time shift is added to wrapping aggFilteredMetric if filter is set
            timeShift: column.filter ? undefined : column.timeShift,
            unit: 'second',
          }),
        ]),
      }).toAst();
    }
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(field.displayName),
      sourceField: field.name,
    };
  },
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('xpack.lens.indexPattern.rate.signature', {
      defaultMessage: 'field: string',
    }),
    description: i18n.translate('xpack.lens.indexPattern.rate.documentation.markdown', {
      defaultMessage: `
Calculates the number of unique values of a specified field. Works for number, string, date and boolean values.

Example: Calculate the number of different products:
\`unique_count(product.name)\`

Example: Calculate the number of different products from the "clothes" group:
\`unique_count(product.name, kql='product.group=clothes')\`
      `,
    }),
  },
  quickFunctionDocumentation: i18n.translate('xpack.lens.indexPattern.rate.documentation.quick', {
    defaultMessage: `
The number of unique values for a specified number, string, date, or boolean field.
      `,
  }),
  paramEditor: function RateParamEditor({
    paramEditorUpdater,
    currentColumn,
    indexPattern,
    paramEditorCustomProps,
  }) {
    const onChange = useCallback(
      (newAggFn: AggregateFnTypes) =>
        paramEditorUpdater({
          ...currentColumn,
          params: {
            ...currentColumn.params,
            aggregateFn: newAggFn,
          },
        } as RateIndexPatternColumn),
      [currentColumn, paramEditorUpdater]
    );
    const { inputValue, handleInputChange } = useDebouncedValue({
      value: currentColumn?.params?.aggregateFn ?? 'aggBucketMax',
      defaultValue: 'aggBucketMax',
      onChange,
    });

    const label = i18n.translate('xpack.lens.indexPattern.rate.aggregateFn', {
      defaultMessage: 'Aggregate Function',
    });

    const options = [
      { value: 'aggBucketSum', label: 'Sum' },
      { value: 'aggBucketAvg', label: 'Average' },
      { value: 'aggBucketMax', label: 'Max' },
      { value: 'aggBucketMin', label: 'Min' },
    ];

    return (
      <EuiFormRow label={label} display="rowCompressed" fullWidth>
        <EuiComboBox
          fullWidth
          compressed
          isClearable={false}
          data-test-subj="indexPattern-tsdb-rate-aggregateFn"
          aria-label={label}
          singleSelection
          options={options}
          selectedOptions={[options.find(({ value }) => value === inputValue) || options[0]]}
          onChange={(choices) => {
            if (!choices.length || choices[0].value == null) {
              return;
            }
            handleInputChange(choices[0].value as AggregateFnTypes);
          }}
        />
      </EuiFormRow>
    );
  },
};
