/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumberProps, EuiFieldNumber } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { AggFunctionsMapping } from '@kbn/data-plugin/public';
import { buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { OperationDefinition } from '.';
import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  isValidNumber,
  getFilter,
  isColumnOfType,
  combineErrorMessages,
} from './helpers';
import { FieldBasedIndexPatternColumn } from './column_types';
import { adjustTimeScaleLabelSuffix } from '../time_scale_utils';
import { useDebouncedValue } from '../../../../shared_components';
import { getDisallowedPreviousShiftMessage } from '../../time_shift_utils';
import { FormRow } from './shared_components';
import { getColumnReducedTimeRangeError } from '../../reduced_time_range_utils';

export interface PercentileRanksIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'percentile_rank';
  params: {
    value: number;
  };
}

function ofName(
  name: string,
  value: number,
  timeShift: string | undefined,
  reducedTimeRange: string | undefined
) {
  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.percentileRanksOf', {
      defaultMessage: 'Percentile rank ({value}) of {name}',
      values: { name, value },
    }),
    undefined,
    undefined,
    undefined,
    timeShift,
    undefined,
    reducedTimeRange
  );
}

const DEFAULT_PERCENTILE_RANKS_VALUE = 0;

const supportedFieldTypes = ['number', 'histogram'];

export const percentileRanksOperation: OperationDefinition<
  PercentileRanksIndexPatternColumn,
  'field',
  { value: number },
  true
> = {
  type: 'percentile_rank',
  allowAsReference: true,
  displayName: i18n.translate('xpack.lens.indexPattern.percentileRank', {
    defaultMessage: 'Percentile rank',
  }),
  input: 'field',
  operationParams: [
    {
      name: 'value',
      type: 'number',
      required: false,
      defaultValue: DEFAULT_PERCENTILE_RANKS_VALUE,
    },
  ],
  filterable: true,
  shiftable: true,
  canReduceTimeRange: true,
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type: fieldType }) => {
    if (
      supportedFieldTypes.includes(fieldType) &&
      aggregatable &&
      (!aggregationRestrictions || !aggregationRestrictions.percentile_ranks)
    ) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedFieldTypes.includes(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || !newField.aggregationRestrictions.percentile_ranks)
    );
  },
  getDefaultLabel: (column, indexPattern, columns) =>
    ofName(
      getSafeName(column.sourceField, indexPattern),
      column.params.value,
      column.timeShift,
      column.reducedTimeRange
    ),
  buildColumn: ({ field, previousColumn, indexPattern }, columnParams) => {
    const existingPercentileRanksParam =
      previousColumn &&
      isColumnOfType<PercentileRanksIndexPatternColumn>('percentile_rank', previousColumn) &&
      previousColumn.params.value;
    const newPercentileRanksParam =
      columnParams?.value ?? (existingPercentileRanksParam || DEFAULT_PERCENTILE_RANKS_VALUE);
    return {
      label: ofName(
        getSafeName(field.name, indexPattern),
        newPercentileRanksParam,
        previousColumn?.timeShift,
        previousColumn?.reducedTimeRange
      ),
      dataType: 'number',
      operationType: 'percentile_rank',
      sourceField: field.name,
      isBucketed: false,
      scale: 'ratio',
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      reducedTimeRange: columnParams?.reducedTimeRange || previousColumn?.reducedTimeRange,
      params: {
        value: newPercentileRanksParam,
        ...getFormatFromPreviousColumn(previousColumn),
      },
    };
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(
        field.displayName,
        oldColumn.params.value,
        oldColumn.timeShift,
        oldColumn.reducedTimeRange
      ),
      sourceField: field.name,
    };
  },
  toEsAggsFn: (column, columnId, _indexPattern) => {
    return buildExpressionFunction<AggFunctionsMapping['aggSinglePercentileRank']>(
      'aggSinglePercentileRank',
      {
        id: columnId,
        enabled: true,
        schema: 'metric',
        field: column.sourceField,
        value: column.params.value,
        // time shift is added to wrapping aggFilteredMetric if filter is set
        timeShift: column.filter ? undefined : column.timeShift,
      }
    ).toAst();
  },
  getErrorMessage: (layer, columnId, indexPattern) =>
    combineErrorMessages([
      getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
      getDisallowedPreviousShiftMessage(layer, columnId),
      getColumnReducedTimeRangeError(layer, columnId, indexPattern),
    ]),
  paramEditor: function PercentileParamEditor({
    paramEditorUpdater,
    currentColumn,
    indexPattern,
    paramEditorCustomProps,
  }) {
    const { labels, isInline } = paramEditorCustomProps || {};
    const percentileRanksLabel =
      labels?.[0] ||
      i18n.translate('xpack.lens.indexPattern.percentile.percentileRanksValue', {
        defaultMessage: 'Percentile ranks value',
      });
    const onChange = useCallback(
      (value) => {
        if (!isValidNumber(value) || Number(value) === currentColumn.params.value) {
          return;
        }
        paramEditorUpdater({
          ...currentColumn,
          label: currentColumn.customLabel
            ? currentColumn.label
            : ofName(
                indexPattern.getFieldByName(currentColumn.sourceField)?.displayName ||
                  currentColumn.sourceField,
                Number(value),
                currentColumn.timeShift,
                currentColumn.reducedTimeRange
              ),
          params: {
            ...currentColumn.params,
            value: Number(value),
          },
        } as PercentileRanksIndexPatternColumn);
      },
      [paramEditorUpdater, currentColumn, indexPattern]
    );
    const { inputValue, handleInputChange: handleInputChangeWithoutValidation } = useDebouncedValue<
      string | undefined
    >(
      {
        onChange,
        value: String(currentColumn.params.value),
      },
      { allowFalsyValue: true }
    );
    const inputValueIsValid = isValidNumber(inputValue);

    const handleInputChange: EuiFieldNumberProps['onChange'] = useCallback(
      (e) => {
        handleInputChangeWithoutValidation(e.currentTarget.value);
      },
      [handleInputChangeWithoutValidation]
    );

    return (
      <FormRow
        isInline={isInline}
        label={percentileRanksLabel}
        data-test-subj="lns-indexPattern-percentile_ranks-form"
        display="rowCompressed"
        fullWidth
        isInvalid={!inputValueIsValid}
        error={
          !inputValueIsValid &&
          i18n.translate('xpack.lens.indexPattern.percentileRanks.errorMessage', {
            defaultMessage: 'Percentile ranks value must be a number',
          })
        }
      >
        <EuiFieldNumber
          fullWidth
          data-test-subj="lns-indexPattern-percentile_ranks-input"
          compressed
          value={inputValue ?? ''}
          onChange={handleInputChange}
          step="any"
          aria-label={percentileRanksLabel}
        />
      </FormRow>
    );
  },
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('xpack.lens.indexPattern.percentileRanks.signature', {
      defaultMessage: 'field: string, [value]: number',
    }),
    description: i18n.translate('xpack.lens.indexPattern.percentileRanks.documentation.markdown', {
      defaultMessage: `
Returns the percentage of values which are below a certain value. For example, if a value is greater than or equal to 95% of the observed values it is said to be at the 95th percentile rank

Example: Get the percentage of values which are below of 100:
\`percentile_rank(bytes, value=100)\`
      `,
    }),
  },
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.percentileRanks.documentation.quick',
    {
      defaultMessage: `
The percentage of values that are below a specific value. For example, when a value is greater than or equal to 95% of the calculated values, the value is the 95th percentile rank.
      `,
    }
  ),
};
