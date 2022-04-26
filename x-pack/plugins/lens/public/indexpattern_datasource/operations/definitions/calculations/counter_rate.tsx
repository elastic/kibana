/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { AggFunctionsMapping } from '@kbn/data-plugin/public';
import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { FieldBasedIndexPatternColumn, FormattedIndexPatternColumn } from '../column_types';
import { IndexPatternLayer } from '../../../types';
import {
  buildLabelFunction,
  getErrorsForDateReference,
  checkForDateHistogram,
  dateBasedOperationToExpression,
  hasDateField,
  checkForDataLayerType,
} from './utils';
import { DEFAULT_TIME_SCALE } from '../../time_scale_utils';
import { OperationDefinition } from '..';
import {
  getFormatFromPreviousColumn,
  getFilter,
  combineErrorMessages,
  getSafeName,
  isColumnOfType,
} from '../helpers';
import { getDisallowedPreviousShiftMessage } from '../../../time_shift_utils';
import { updateColumnParam } from '../../layer_helpers';

const ofName = buildLabelFunction((name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.CounterRateOf', {
    defaultMessage: 'Counter rate of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
});

export type CounterRateIndexPatternColumn = FormattedIndexPatternColumn &
  FieldBasedIndexPatternColumn & {
    operationType: 'counter_rate';
    params: {
      aggregate?: string;
    };
  };

export const counterRateOperation: OperationDefinition<CounterRateIndexPatternColumn, 'field'> = {
  type: 'counter_rate',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.counterRate', {
    defaultMessage: 'Counter rate',
  }),
  input: 'field',
  operationParams: [{ name: 'aggregate', type: 'string', required: false }],
  getPossibleOperationForField: ({ type }) => {
    if (type === 'number') {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  getDefaultLabel: (column, indexPattern, columns) => {
    return ofName(
      getSafeName(column.sourceField, indexPattern),
      column.timeScale,
      column.timeShift
    );
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(field.displayName, oldColumn.timeScale, oldColumn.timeShift),
      sourceField: field.name,
    };
  },
  toExpression: (layer, columnId) => {
    if (!layer.columns[columnId].params?.aggregate) {
      return dateBasedOperationToExpression(layer, columnId, 'lens_counter_rate');
    }
    return [];
  },
  buildColumn: ({ previousColumn, field, indexPattern }, columnParams) => {
    const counterRateColumnParams = columnParams as CounterRateIndexPatternColumn;
    const timeScale =
      previousColumn?.timeScale || counterRateColumnParams?.timeScale || DEFAULT_TIME_SCALE;
    return {
      label: ofName(getSafeName(field.name, indexPattern), timeScale, previousColumn?.timeShift),
      dataType: 'number',
      operationType: 'counter_rate',
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      filter: getFilter(previousColumn, columnParams),
      params: {
        aggregate: columnParams?.aggregate
          ? columnParams.aggregate
          : previousColumn &&
            isColumnOfType<CounterRateIndexPatternColumn>('counter_rate', previousColumn)
          ? previousColumn.params?.aggregate
          : field?.indices.every((index) => index.time_series_metric)
          ? 'Sum'
          : undefined,
        ...getFormatFromPreviousColumn(previousColumn),
      },
    };
  },
  toEsAggsFn: (column, columnId, _indexPattern) => {
    if (!column.params!.aggregate) {
      return buildExpressionFunction<AggFunctionsMapping['aggMax']>('aggMax', {
        id: columnId,
        enabled: true,
        schema: 'metric',
        field: column.sourceField,
        // time shift is added to wrapping aggFilteredMetric if filter is set
        timeShift: column.filter ? undefined : column.timeShift,
      }).toAst();
    }
    return buildExpressionFunction(`aggBucket${column.params!.aggregate}`, {
      id: columnId,
      enabled: true,
      schema: 'metric',
      // time shift is added to wrapping aggFilteredMetric if filter is set
      timeShift: column.filter ? undefined : column.timeShift,
      customMetric: buildExpression([
        buildExpressionFunction<AggFunctionsMapping['aggRate']>('aggRate', {
          id: columnId,
          enabled: true,
          schema: 'metric',
          field: column.sourceField,
          // time shift is added to wrapping aggFilteredMetric if filter is set
          timeShift: column.filter ? undefined : column.timeShift,
        }),
      ]).toAst(),
      emptyAsNull: column.params?.aggregate === 'Sum' ? true : undefined,
      customBucket: buildExpression([
        buildExpressionFunction('aggMultiTerms', {
          id: `${columnId}-bucket`,
          enabled: true,
          schema: 'bucket',
          fields: _indexPattern.fields
            .filter((f) => f.indices && f.indices.every((i) => i.time_series_dimension))
            .map((i) => i.name),
        }),
      ]).toAst(),
    }).toAst();
  },
  paramEditor: ({ layer, currentColumn, layerId, indexPattern, columnId, updateLayer }) => {
    const field = indexPattern.getFieldByName(currentColumn.sourceField);
    if (!field?.indices.every((index) => index.time_series_metric)) {
      return null;
    }
    const isShowAllDimensions = Object.values(layer.columns).some((c) => c.params?.allDimensions);
    return (
      <EuiFormRow label={<>Aggregate individual time series </>} display="rowCompressed" fullWidth>
        <EuiSelect
          compressed
          data-test-subj="indexPattern-terms-orderBy"
          disabled={isShowAllDimensions}
          options={[
            { text: 'sum', value: 'Sum' },
            { text: 'min', value: 'Min' },
            { text: 'max', value: 'Max' },
            { text: 'avg', value: 'Avg' },
          ]}
          value={currentColumn.params?.aggregate || 'sum'}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            updateLayer(
              updateColumnParam({
                layer,
                columnId,
                paramName: 'aggregate',
                value: e.target.value,
              })
            );
          }}
        />
      </EuiFormRow>
    );
  },
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return combineErrorMessages([getDisallowedPreviousShiftMessage(layer, columnId)]);
  },
  getDisabledStatus(indexPattern, layer, layerType) {
    const opName = i18n.translate('xpack.lens.indexPattern.counterRate', {
      defaultMessage: 'Counter rate',
    });
    if (layerType) {
      const dataLayerErrors = checkForDataLayerType(layerType, opName);
      if (dataLayerErrors) {
        return dataLayerErrors.join(', ');
      }
    }

    return checkForDateHistogram(layer, opName)?.join(', ');
  },
  timeScalingMode: 'mandatory',
  filterable: true,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('xpack.lens.indexPattern.counterRate.signature', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('xpack.lens.indexPattern.counterRate.documentation.markdown', {
      defaultMessage: `
Calculates the rate of an ever increasing counter. This function will only yield helpful results on counter metric fields which contain a measurement of some kind monotonically growing over time.
If the value does get smaller, it will interpret this as a counter reset. To get most precise results, \`counter_rate\` should be calculated on the \`max\` of a field.

This calculation will be done separately for separate series defined by filters or top values dimensions.
It uses the current interval when used in Formula.

Example: Visualize the rate of bytes received over time by a memcached server:
\`counter_rate(max(memcached.stats.read.bytes))\`
      `,
    }),
  },
  shiftable: true,
};
