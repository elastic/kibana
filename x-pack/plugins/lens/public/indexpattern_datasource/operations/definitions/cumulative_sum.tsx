/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from './column_types';
import { IndexPatternLayer } from '../../types';

const ofName = (name: string) => {
  return i18n.translate('xpack.lens.indexPattern.cumulativeSumOf', {
    defaultMessage: 'Cumulative sum of {name}',
    values: { name },
  });
};

export type CumulativeSumIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'cumulative_sum';
  };

export const cumulativeSumOperation: OperationDefinition<
  CumulativeSumIndexPatternColumn,
  'fullReference'
> = {
  type: 'cumulative_sum',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
    defaultMessage: 'Cumulative sum',
  }),
  input: 'fullReference',
  requiredReferences: [
    {
      input: ['field'],
      specificOperations: ['count', 'sum'],
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
    return i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
      defaultMessage: 'Cumulative sum',
    });
  },
  toExpression: (layer, columnId) => {
    const currentColumn = (layer.columns[columnId] as unknown) as CumulativeSumIndexPatternColumn;
    const buckets = layer.columnOrder.filter((colId) => layer.columns[colId].isBucketed);
    const dateColumnIndex = buckets.findIndex(
      (colId) => layer.columns[colId].operationType === 'date_histogram'
    )!;
    buckets.splice(dateColumnIndex, 1);

    return [
      {
        type: 'function',
        function: 'cumulative_sum',
        arguments: {
          by: buckets,
          inputColumnId: [currentColumn.references[0]],
          outputColumnId: [columnId],
        },
      },
    ];
  },
  buildColumn: ({ referenceIds, previousColumn, columns }) => {
    const metric = columns[referenceIds[0]];
    return {
      label: ofName(metric.label),
      dataType: 'number',
      operationType: 'cumulative_sum',
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
  isTransferable: () => {
    return true;
  },
  getErrorMessage: (layer: IndexPatternLayer) => {
    const buckets = layer.columnOrder.filter((colId) => layer.columns[colId].isBucketed);
    const hasDateHistogram = buckets.some(
      (colId) => layer.columns[colId].operationType === 'date_histogram'
    );
    if (hasDateHistogram) {
      return undefined;
    }
    return ['Needs a date histogram to work'];
  },
};
