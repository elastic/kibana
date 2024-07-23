/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { COUNTER_RATE_ID, COUNTER_RATE_NAME } from '@kbn/lens-formula-docs';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { FormBasedLayer } from '../../../types';
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
import { getFormatFromPreviousColumn, getFilter } from '../helpers';

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
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof COUNTER_RATE_ID;
  };

export const counterRateOperation: OperationDefinition<
  CounterRateIndexPatternColumn,
  'fullReference'
> = {
  type: COUNTER_RATE_ID,
  priority: 1,
  displayName: COUNTER_RATE_NAME,
  input: 'fullReference',
  selectionStyle: 'field',
  requiredReferences: [
    {
      input: ['field', 'managedReference'],
      specificOperations: ['max'],
      validateMetadata: (meta) => meta.dataType === 'number' && !meta.isBucketed,
    },
  ],
  // return false for quick function as the built-in reference will use max
  // in formula this check won't be used and the check is performed on the formula AST tree traversal independently
  getUnsupportedSettings: () => ({
    sampling: false,
  }),
  getPossibleOperation: (indexPattern) => {
    if (hasDateField(indexPattern)) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  getDefaultLabel: (column, columns, indexPattern) => {
    const ref = columns[column.references[0]];
    return ofName(
      ref && 'sourceField' in ref
        ? indexPattern?.getFieldByName(ref.sourceField)?.displayName
        : undefined,
      column.timeScale,
      column.timeShift
    );
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'lens_counter_rate');
  },
  buildColumn: ({ referenceIds, previousColumn, layer, indexPattern }, columnParams) => {
    const metric = layer.columns[referenceIds[0]];
    const counterRateColumnParams = columnParams as CounterRateIndexPatternColumn;
    const timeScale =
      previousColumn?.timeScale || counterRateColumnParams?.timeScale || DEFAULT_TIME_SCALE;
    return {
      label: ofName(
        metric && 'sourceField' in metric
          ? indexPattern.getFieldByName(metric.sourceField)?.displayName
          : undefined,
        timeScale,
        previousColumn?.timeShift
      ),
      dataType: 'number',
      operationType: 'counter_rate',
      isBucketed: false,
      scale: 'ratio',
      references: referenceIds,
      timeScale,
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      filter: getFilter(previousColumn, columnParams),
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  getErrorMessage: (layer: FormBasedLayer, columnId: string) => {
    return getErrorsForDateReference(
      layer,
      columnId,
      i18n.translate('xpack.lens.indexPattern.counterRate', {
        defaultMessage: 'Counter rate',
      })
    );
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

    return checkForDateHistogram(layer, opName)
      .map((e) => e.message)
      .join(', ');
  },
  timeScalingMode: 'mandatory',
  filterable: true,
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.counterRate.documentation.quick',
    {
      defaultMessage: `
      The rate of change over time for an ever growing time series metric.
      `,
    }
  ),
  shiftable: true,
};
