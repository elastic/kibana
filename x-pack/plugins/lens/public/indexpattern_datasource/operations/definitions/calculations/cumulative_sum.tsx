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
  checkForDateHistogram,
  getErrorsForDateReference,
  dateBasedOperationToExpression,
  hasDateField,
  buildLabelFunction,
  checkForDataLayerType,
} from './utils';
import { OperationDefinition } from '..';
import { getFormatFromPreviousColumn, getFilter, combineErrorMessages } from '../helpers';
import { getDisallowedPreviousShiftMessage } from '../../../time_shift_utils';

const ofName = buildLabelFunction((name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.cumulativeSumOf', {
    defaultMessage: 'Cumulative sum of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
});

export type CumulativeSumIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'cumulative_sum';
  };

export const cumulativeSumOperation: OperationDefinition<
  CumulativeSumIndexPatternColumn,
  'fullReference'
> = {
  type: 'cumulative_sum',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
    defaultMessage: 'Cumulative sum',
  }),
  input: 'fullReference',
  selectionStyle: 'field',
  requiredReferences: [
    {
      input: ['field', 'managedReference'],
      specificOperations: ['count', 'sum'],
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
      undefined,
      column.timeShift
    );
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'cumulative_sum');
  },
  buildColumn: ({ referenceIds, previousColumn, layer, indexPattern }, columnParams) => {
    const ref = layer.columns[referenceIds[0]];
    return {
      label: ofName(
        ref && 'sourceField' in ref
          ? indexPattern.getFieldByName(ref.sourceField)?.displayName
          : undefined,
        undefined,
        previousColumn?.timeShift
      ),
      dataType: 'number',
      operationType: 'cumulative_sum',
      isBucketed: false,
      scale: 'ratio',
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      filter: getFilter(previousColumn, columnParams),
      references: referenceIds,
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  isTransferable: () => {
    return true;
  },
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return combineErrorMessages([
      getErrorsForDateReference(
        layer,
        columnId,
        i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
          defaultMessage: 'Cumulative sum',
        })
      ),
      getDisallowedPreviousShiftMessage(layer, columnId),
    ]);
  },
  getDisabledStatus(indexPattern, layer, layerType) {
    const opName = i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
      defaultMessage: 'Cumulative sum',
    });
    if (layerType) {
      const dataLayerErrors = checkForDataLayerType(layerType, opName);
      if (dataLayerErrors) {
        return dataLayerErrors.join(', ');
      }
    }
    return checkForDateHistogram(layer, opName)?.join(', ');
  },
  filterable: true,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('xpack.lens.indexPattern.cumulative_sum.signature', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('xpack.lens.indexPattern.cumulativeSum.documentation.markdown', {
      defaultMessage: `
Calculates the cumulative sum of a metric over time, adding all previous values of a series to each value. To use this function, you need to configure a date histogram dimension as well.

This calculation will be done separately for separate series defined by filters or top values dimensions.

Example: Visualize the received bytes accumulated over time:
\`cumulative_sum(sum(bytes))\`
      `,
    }),
  },
  shiftable: true,
};
