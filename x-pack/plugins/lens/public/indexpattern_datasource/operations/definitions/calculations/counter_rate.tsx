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
  return i18n.translate('xpack.lens.indexPattern.CounterRateOf', {
    defaultMessage: 'Counter rate of {name}',
    values: { name },
  });
};

export type CounterRateIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'counter_rate';
  };

export const counterRateOperation: OperationDefinition<
  CounterRateIndexPatternColumn,
  'fullReference'
> = {
  type: 'counter_rate',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.counterRate', {
    defaultMessage: 'Counter rate',
  }),
  input: 'fullReference',
  selectionStyle: 'field',
  requiredReferences: [
    {
      input: ['field'],
      specificOperations: ['max'],
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
    return i18n.translate('xpack.lens.indexPattern.counterRate', {
      defaultMessage: 'Counter rate',
    });
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'lens_counter_rate');
  },
  buildColumn: ({ referenceIds, previousColumn, layer }) => {
    const metric = layer.columns[referenceIds[0]];
    return {
      label: ofName(metric.label),
      dataType: 'number',
      operationType: 'counter_rate',
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
