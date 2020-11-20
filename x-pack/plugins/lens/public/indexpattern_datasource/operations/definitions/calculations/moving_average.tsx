/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPatternLayer } from '../../../types';
import { checkForDateHistogram, dateBasedOperationToExpression, hasDateField } from './utils';
import { OperationDefinition } from '..';

const ofName = (name: string) => {
  return i18n.translate('xpack.lens.indexPattern.movingAverageOf', {
    defaultMessage: 'Moving average of {name}',
    values: { name },
  });
};

export type MovingAverageIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'moving_average';
  };

export const movingAverageOperation: OperationDefinition<
  MovingAverageIndexPatternColumn,
  'fullReference'
> = {
  type: 'moving_average',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.movingAverage', {
    defaultMessage: 'Moving Average',
  }),
  input: 'fullReference',
  selectionStyle: 'full',
  requiredReferences: [
    {
      input: ['field'],
      validateMetadata: (metadata) =>
        metadata.dataType === 'number' && metadata.isBucketed === false,
    },
  ],
  getPossibleOperation: () => {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  getDefaultLabel: () => {
    return i18n.translate('xpack.lens.indexPattern.movingAverage', {
      defaultMessage: 'Moving Average',
    });
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'moving_average');
  },
  buildColumn: ({ referenceIds, previousColumn, layer }) => {
    const metric = layer.columns[referenceIds[0]];
    return {
      label: ofName(metric.label),
      dataType: 'number',
      operationType: 'moving_average',
      isBucketed: false,
      scale: 'ratio',
      references: referenceIds,
      params:
        previousColumn?.dataType === 'number' &&
        previousColumn.params &&
        'format' in previousColumn.params &&
        previousColumn.params.format
          ? { format: previousColumn.params.format }
          : undefined,
    };
  },
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  getErrorMessage: (layer: IndexPatternLayer) => {
    return checkForDateHistogram(layer);
  },
};
