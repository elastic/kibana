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
  checkForDateHistogram,
  getErrorsForDateReference,
  dateBasedOperationToExpression,
  hasDateField,
  checkForDataLayerType,
} from './utils';
import { adjustTimeScaleOnOtherColumnChange } from '../../time_scale_utils';
import { OperationDefinition } from '..';
import { getFormatFromPreviousColumn, getFilter, combineErrorMessages } from '../helpers';
import { getDisallowedPreviousShiftMessage } from '../../../time_shift_utils';

const OPERATION_NAME = 'differences';

const ofName = buildLabelFunction((name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.derivativeOf', {
    defaultMessage: 'Differences of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
});

export type DerivativeIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof OPERATION_NAME;
  };

export const derivativeOperation: OperationDefinition<
  DerivativeIndexPatternColumn,
  'fullReference'
> = {
  type: OPERATION_NAME,
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.derivative', {
    defaultMessage: 'Differences',
  }),
  input: 'fullReference',
  selectionStyle: 'full',
  requiredReferences: [
    {
      input: ['field', 'managedReference'],
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
    return ofName(columns[column.references[0]]?.label, column.timeScale, column.timeShift);
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'derivative');
  },
  buildColumn: ({ referenceIds, previousColumn, layer }, columnParams) => {
    const ref = layer.columns[referenceIds[0]];
    const differencesColumnParams = columnParams as DerivativeIndexPatternColumn;
    const timeScale = differencesColumnParams?.timeScale ?? previousColumn?.timeScale;
    return {
      label: ofName(ref?.label, previousColumn?.timeScale, previousColumn?.timeShift),
      dataType: 'number',
      operationType: OPERATION_NAME,
      isBucketed: false,
      scale: 'ratio',
      references: referenceIds,
      timeScale,
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  onOtherColumnChanged: adjustTimeScaleOnOtherColumnChange,
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return combineErrorMessages([
      getErrorsForDateReference(
        layer,
        columnId,
        i18n.translate('xpack.lens.indexPattern.derivative', {
          defaultMessage: 'Differences',
        })
      ),
      getDisallowedPreviousShiftMessage(layer, columnId),
    ]);
  },
  getDisabledStatus(indexPattern, layer, layerType) {
    const opName = i18n.translate('xpack.lens.indexPattern.derivative', {
      defaultMessage: 'Differences',
    });
    if (layerType) {
      const dataLayerErrors = checkForDataLayerType(layerType, opName);
      if (dataLayerErrors) {
        return dataLayerErrors.join(', ');
      }
    }
    return checkForDateHistogram(layer, opName)?.join(', ');
  },
  timeScalingMode: 'optional',
  filterable: true,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('xpack.lens.indexPattern.differences.signature', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('xpack.lens.indexPattern.differences.documentation.markdown', {
      defaultMessage: `
Calculates the difference to the last value of a metric over time. To use this function, you need to configure a date histogram dimension as well.
Differences requires the data to be sequential. If your data is empty when using differences, try increasing the date histogram interval.

This calculation will be done separately for separate series defined by filters or top values dimensions.

Example: Visualize the change in bytes received over time:
\`differences(sum(bytes))\`
      `,
    }),
  },
  shiftable: true,
};
