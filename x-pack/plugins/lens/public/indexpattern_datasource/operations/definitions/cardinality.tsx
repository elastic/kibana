/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiSwitch } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { AggFunctionsMapping } from '../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { OperationDefinition, ParamEditorProps } from './index';
import { FieldBasedIndexPatternColumn, ValueFormatConfig } from './column_types';

import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
  combineErrorMessages,
  isColumnOfType,
} from './helpers';
import { adjustTimeScaleLabelSuffix } from '../time_scale_utils';
import { getDisallowedPreviousShiftMessage } from '../../time_shift_utils';
import { updateColumnParam } from '../layer_helpers';

const supportedTypes = new Set([
  'string',
  'boolean',
  'number',
  'number_range',
  'ip',
  'ip_range',
  'date',
  'date_range',
  'murmur3',
]);

const SCALE = 'ratio';
const OPERATION_TYPE = 'unique_count';
const IS_BUCKETED = false;

function ofName(name: string, timeShift: string | undefined) {
  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.cardinalityOf', {
      defaultMessage: 'Unique count of {name}',
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

export interface CardinalityIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof OPERATION_TYPE;
  params?: {
    emptyAsNull?: boolean;
    format?: ValueFormatConfig;
  };
}

export const cardinalityOperation: OperationDefinition<CardinalityIndexPatternColumn, 'field'> = {
  type: OPERATION_TYPE,
  displayName: i18n.translate('xpack.lens.indexPattern.cardinality', {
    defaultMessage: 'Unique count',
  }),
  input: 'field',
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.cardinality)
    ) {
      return { dataType: 'number', isBucketed: IS_BUCKETED, scale: SCALE };
    }
  },
  getErrorMessage: (layer, columnId, indexPattern) =>
    combineErrorMessages([
      getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
      getDisallowedPreviousShiftMessage(layer, columnId),
    ]),
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.cardinality)
    );
  },
  filterable: true,
  shiftable: true,
  getDefaultLabel: (column, indexPattern) =>
    ofName(getSafeName(column.sourceField, indexPattern), column.timeShift),
  buildColumn({ field, previousColumn }, columnParams) {
    return {
      label: ofName(field.displayName, previousColumn?.timeShift),
      dataType: 'number',
      operationType: OPERATION_TYPE,
      scale: SCALE,
      sourceField: field.name,
      isBucketed: IS_BUCKETED,
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      params: {
        ...getFormatFromPreviousColumn(previousColumn),
        emptyAsNull:
          previousColumn &&
          isColumnOfType<CardinalityIndexPatternColumn>('unique_count', previousColumn)
            ? previousColumn.params?.emptyAsNull
            : !columnParams?.usedInMath,
      },
    };
  },
  getAdvancedOptions: ({
    layer,
    columnId,
    currentColumn,
    updateLayer,
  }: ParamEditorProps<CardinalityIndexPatternColumn>) => {
    return [
      {
        dataTestSubj: 'hide-zero-values',
        optionElement: (
          <>
            <EuiSwitch
              label={i18n.translate('xpack.lens.indexPattern.hideZero', {
                defaultMessage: 'Hide zero values',
              })}
              labelProps={{
                style: {
                  fontWeight: euiThemeVars.euiFontWeightMedium,
                },
              }}
              checked={Boolean(currentColumn.params?.emptyAsNull)}
              onChange={() => {
                updateLayer(
                  updateColumnParam({
                    layer,
                    columnId,
                    paramName: 'emptyAsNull',
                    value: !currentColumn.params?.emptyAsNull,
                  })
                );
              }}
              compressed
            />
          </>
        ),
        title: '',
        showInPopover: true,
        inlineElement: null,
        onClick: () => {},
      },
    ];
  },
  toEsAggsFn: (column, columnId) => {
    return buildExpressionFunction<AggFunctionsMapping['aggCardinality']>('aggCardinality', {
      id: columnId,
      enabled: true,
      schema: 'metric',
      field: column.sourceField,
      // time shift is added to wrapping aggFilteredMetric if filter is set
      timeShift: column.filter ? undefined : column.timeShift,
      emptyAsNull: column.params?.emptyAsNull,
    }).toAst();
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(field.displayName, oldColumn.timeShift),
      sourceField: field.name,
    };
  },
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('xpack.lens.indexPattern.cardinality.signature', {
      defaultMessage: 'field: string',
    }),
    description: i18n.translate('xpack.lens.indexPattern.cardinality.documentation.markdown', {
      defaultMessage: `
Calculates the number of unique values of a specified field. Works for number, string, date and boolean values.

Example: Calculate the number of different products:
\`unique_count(product.name)\`

Example: Calculate the number of different products from the "clothes" group:
\`unique_count(product.name, kql='product.group=clothes')\`
      `,
    }),
  },
};
