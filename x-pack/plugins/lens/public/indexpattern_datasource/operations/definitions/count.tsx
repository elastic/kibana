/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiSwitch } from '@elastic/eui';
import { AggFunctionsMapping } from '../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { OperationDefinition, ParamEditorProps } from './index';
import { FieldBasedIndexPatternColumn, ValueFormatConfig } from './column_types';
import { IndexPatternField } from '../../types';
import {
  getInvalidFieldMessage,
  getFilter,
  combineErrorMessages,
  getFormatFromPreviousColumn,
  isColumnOfType,
} from './helpers';
import {
  adjustTimeScaleLabelSuffix,
  adjustTimeScaleOnOtherColumnChange,
} from '../time_scale_utils';
import { getDisallowedPreviousShiftMessage } from '../../time_shift_utils';
import { updateColumnParam } from '../layer_helpers';

const countLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Count of records',
});

export type CountIndexPatternColumn = FieldBasedIndexPatternColumn & {
  operationType: 'count';
  params?: {
    emptyAsNull?: boolean;
    format?: ValueFormatConfig;
  };
};

export const countOperation: OperationDefinition<CountIndexPatternColumn, 'field'> = {
  type: 'count',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.count', {
    defaultMessage: 'Count',
  }),
  input: 'field',
  getErrorMessage: (layer, columnId, indexPattern) =>
    combineErrorMessages([
      getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
      getDisallowedPreviousShiftMessage(layer, columnId),
    ]),
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: adjustTimeScaleLabelSuffix(
        field.displayName,
        undefined,
        oldColumn.timeScale,
        undefined,
        oldColumn.timeShift
      ),
      sourceField: field.name,
    };
  },
  getPossibleOperationForField: (field: IndexPatternField) => {
    if (field.type === 'document') {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  getDefaultLabel: (column) =>
    adjustTimeScaleLabelSuffix(
      countLabel,
      undefined,
      column.timeScale,
      undefined,
      column.timeShift
    ),
  buildColumn({ field, previousColumn }, columnParams) {
    return {
      label: adjustTimeScaleLabelSuffix(
        countLabel,
        undefined,
        previousColumn?.timeScale,
        undefined,
        previousColumn?.timeShift
      ),
      dataType: 'number',
      operationType: 'count',
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      timeScale: previousColumn?.timeScale,
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      params: {
        ...getFormatFromPreviousColumn(previousColumn),
        emptyAsNull:
          previousColumn && isColumnOfType<CountIndexPatternColumn>('count', previousColumn)
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
  }: ParamEditorProps<CountIndexPatternColumn>) => {
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
  onOtherColumnChanged: (layer, thisColumnId, changedColumnId) =>
    adjustTimeScaleOnOtherColumnChange<CountIndexPatternColumn>(
      layer,
      thisColumnId,
      changedColumnId
    ),
  toEsAggsFn: (column, columnId) => {
    return buildExpressionFunction<AggFunctionsMapping['aggCount']>('aggCount', {
      id: columnId,
      enabled: true,
      schema: 'metric',
      // time shift is added to wrapping aggFilteredMetric if filter is set
      timeShift: column.filter ? undefined : column.timeShift,
      emptyAsNull: column.params?.emptyAsNull,
    }).toAst();
  },
  isTransferable: () => {
    return true;
  },
  timeScalingMode: 'optional',
  filterable: true,
  documentation: {
    section: 'elasticsearch',
    signature: '',
    description: i18n.translate('xpack.lens.indexPattern.count.documentation.markdown', {
      defaultMessage: `
Calculates the number of documents.

Example: Calculate the number of documents:
\`count()\`

Example: Calculate the number of documents matching a certain filter:
\`count(kql='price > 500')\`
      `,
    }),
  },
  shiftable: true,
};
