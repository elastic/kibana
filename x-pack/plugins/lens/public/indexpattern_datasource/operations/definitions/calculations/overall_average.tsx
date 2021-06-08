/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { optionallHistogramBasedOperationToExpression } from './utils';
import { OperationDefinition } from '..';
import { getFormatFromPreviousColumn } from '../helpers';

const ofName = (name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.overallAverageOf', {
    defaultMessage: 'Overall average of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
};

export type OverallAverageIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'overall_average';
  };

export const overallAverageOperation: OperationDefinition<
  OverallAverageIndexPatternColumn,
  'fullReference'
> = {
  type: 'overall_average',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.overallAverage', {
    defaultMessage: 'Overall average',
  }),
  input: 'fullReference',
  selectionStyle: 'hidden',
  requiredReferences: [
    {
      input: ['field', 'managedReference'],
      validateMetadata: (meta) => meta.dataType === 'number' && !meta.isBucketed,
    },
  ],
  getPossibleOperation: () => {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  getDefaultLabel: (column, indexPattern, columns) => {
    const ref = columns[column.references[0]];
    return ofName(
      ref && 'sourceField' in ref
        ? indexPattern.getFieldByName(ref.sourceField)?.displayName
        : undefined
    );
  },
  toExpression: (layer, columnId) => {
    return optionallHistogramBasedOperationToExpression(layer, columnId, 'overall_metric', {
      metric: ['average'],
    });
  },
  buildColumn: ({ referenceIds, previousColumn, layer, indexPattern }, columnParams) => {
    const ref = layer.columns[referenceIds[0]];
    let filter = previousColumn?.filter;
    if (columnParams) {
      if ('kql' in columnParams) {
        filter = { query: columnParams.kql ?? '', language: 'kuery' };
      } else if ('lucene' in columnParams) {
        filter = { query: columnParams.lucene ?? '', language: 'lucene' };
      }
    }
    return {
      label: ofName(
        ref && 'sourceField' in ref
          ? indexPattern.getFieldByName(ref.sourceField)?.displayName
          : undefined
      ),
      dataType: 'number',
      operationType: 'overall_average',
      isBucketed: false,
      scale: 'ratio',
      filter,
      references: referenceIds,
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  isTransferable: () => {
    return true;
  },

  filterable: false,
  shiftable: false,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('xpack.lens.indexPattern.overall_average.signature', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('xpack.lens.indexPattern.overall_average.documentation', {
      defaultMessage: `
Calculates the average of a metric for all data points of a series in the current chart. A series is defined by a dimension using a date histogram or interval function.
Other dimensions breaking down the data like top values or filter are treated as separate series.

If no date histograms or interval functions are used in the current chart, \`overall_average\` is calculating the average over all dimensions no matter the used function

Example: Divergence from the mean:
\`sum(bytes) - overall_average(sum(bytes))\`
      `,
    }),
  },
};
