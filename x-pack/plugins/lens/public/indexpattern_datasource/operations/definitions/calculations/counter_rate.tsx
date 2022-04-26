/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
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
import { getFormatFromPreviousColumn, getFilter, combineErrorMessages } from '../helpers';
import { getDisallowedPreviousShiftMessage } from '../../../time_shift_utils';

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
    operationType: 'counter_rate';
  };

export const counterRateOperation: OperationDefinition<
  CounterRateIndexPatternColumn,
  'fullReference'
> = {
  type: 'counter_rate',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.counterRate', {
    defaultMessage: 'Counter rate',
  }),
  input: 'fullReference',
  selectionStyle: 'field',
  requiredReferences: [
    {
      input: ['field', 'managedReference'],
      specificOperations: ['max'],
      validateMetadata: (meta) => meta.dataType === 'number' && !meta.isBucketed,
    },
  ],
  getPossibleOperation: (indexPattern) => {
    if (hasDateField(indexPattern)) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  getDefaultLabel: (column, indexPattern, columns) => {
    const ref = columns[column.references[0]];
    return ofName(
      ref && 'sourceField' in ref
        ? indexPattern.getFieldByName(ref.sourceField)?.displayName
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
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return combineErrorMessages([
      getErrorsForDateReference(
        layer,
        columnId,
        i18n.translate('xpack.lens.indexPattern.counterRate', {
          defaultMessage: 'Counter rate',
        })
      ),
      getDisallowedPreviousShiftMessage(layer, columnId),
    ]);
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
