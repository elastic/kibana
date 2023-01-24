/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  FormattedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from '../column_types';
import { optionallHistogramBasedOperationToExpression } from './utils';
import type { OperationDefinition } from '..';
import { getFormatFromPreviousColumn } from '../helpers';

type OverallMetricIndexPatternColumn<T extends string> = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: T;
  };

export type OverallSumIndexPatternColumn = OverallMetricIndexPatternColumn<'overall_sum'>;
export type OverallMinIndexPatternColumn = OverallMetricIndexPatternColumn<'overall_min'>;
export type OverallMaxIndexPatternColumn = OverallMetricIndexPatternColumn<'overall_max'>;
export type OverallAverageIndexPatternColumn = OverallMetricIndexPatternColumn<'overall_average'>;

function buildOverallMetricOperation<T extends OverallMetricIndexPatternColumn<string>>({
  type,
  displayName,
  ofName,
  description,
  metric,
}: {
  type: T['operationType'];
  displayName: string;
  ofName: (name?: string) => string;
  description: string;
  metric: string;
}): OperationDefinition<T, 'fullReference'> {
  return {
    type,
    priority: 1,
    displayName,
    input: 'fullReference',
    selectionStyle: 'hidden',
    requiredReferences: [
      {
        input: ['field', 'managedReference', 'fullReference'],
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
        metric: [metric],
      });
    },
    buildColumn: ({ referenceIds, previousColumn, layer, indexPattern }, columnParams) => {
      const ref = layer.columns[referenceIds[0]];
      return {
        label: ofName(
          ref && 'sourceField' in ref
            ? indexPattern.getFieldByName(ref.sourceField)?.displayName
            : undefined
        ),
        dataType: 'number',
        operationType: `overall_${metric}`,
        isBucketed: false,
        scale: 'ratio',
        references: referenceIds,
        params: getFormatFromPreviousColumn(previousColumn),
      } as T;
    },
    isTransferable: () => {
      return true;
    },
    filterable: false,
    shiftable: false,
    documentation: {
      section: 'calculation',
      signature: i18n.translate('xpack.lens.indexPattern.overall_metric', {
        defaultMessage: 'metric: number',
      }),
      description,
    },
  };
}

export const overallSumOperation = buildOverallMetricOperation<OverallSumIndexPatternColumn>({
  type: 'overall_sum',
  displayName: i18n.translate('xpack.lens.indexPattern.overallSum', {
    defaultMessage: 'Overall sum',
  }),
  ofName: (name?: string) => {
    return i18n.translate('xpack.lens.indexPattern.overallSumOf', {
      defaultMessage: 'Overall sum of {name}',
      values: {
        name:
          name ??
          i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
            defaultMessage: '(incomplete)',
          }),
      },
    });
  },
  metric: 'sum',
  description: i18n.translate('xpack.lens.indexPattern.overall_sum.documentation.markdown', {
    defaultMessage: `
Calculates the sum of a metric of all data points of a series in the current chart. A series is defined by a dimension using a date histogram or interval function.
Other dimensions breaking down the data like top values or filter are treated as separate series.

If no date histograms or interval functions are used in the current chart, \`overall_sum\` is calculating the sum over all dimensions no matter the used function.

Example: Percentage of total
\`sum(bytes) / overall_sum(sum(bytes))\`
      `,
  }),
});

export const overallMinOperation = buildOverallMetricOperation<OverallMinIndexPatternColumn>({
  type: 'overall_min',
  displayName: i18n.translate('xpack.lens.indexPattern.overallMin', {
    defaultMessage: 'Overall min',
  }),
  ofName: (name?: string) => {
    return i18n.translate('xpack.lens.indexPattern.overallMinOf', {
      defaultMessage: 'Overall min of {name}',
      values: {
        name:
          name ??
          i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
            defaultMessage: '(incomplete)',
          }),
      },
    });
  },
  metric: 'min',
  description: i18n.translate('xpack.lens.indexPattern.overall_min.documentation.markdown', {
    defaultMessage: `
Calculates the minimum of a metric for all data points of a series in the current chart. A series is defined by a dimension using a date histogram or interval function.
Other dimensions breaking down the data like top values or filter are treated as separate series.

If no date histograms or interval functions are used in the current chart, \`overall_min\` is calculating the minimum over all dimensions no matter the used function

Example: Percentage of range
\`(sum(bytes) - overall_min(sum(bytes)) / (overall_max(sum(bytes)) - overall_min(sum(bytes)))\`
      `,
  }),
});

export const overallMaxOperation = buildOverallMetricOperation<OverallMaxIndexPatternColumn>({
  type: 'overall_max',
  displayName: i18n.translate('xpack.lens.indexPattern.overallMax', {
    defaultMessage: 'Overall max',
  }),
  ofName: (name?: string) => {
    return i18n.translate('xpack.lens.indexPattern.overallMaxOf', {
      defaultMessage: 'Overall max of {name}',
      values: {
        name:
          name ??
          i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
            defaultMessage: '(incomplete)',
          }),
      },
    });
  },
  metric: 'max',
  description: i18n.translate('xpack.lens.indexPattern.overall_max.documentation.markdown', {
    defaultMessage: `
Calculates the maximum of a metric for all data points of a series in the current chart. A series is defined by a dimension using a date histogram or interval function.
Other dimensions breaking down the data like top values or filter are treated as separate series.

If no date histograms or interval functions are used in the current chart, \`overall_max\` is calculating the maximum over all dimensions no matter the used function

Example: Percentage of range
\`(sum(bytes) - overall_min(sum(bytes))) / (overall_max(sum(bytes)) - overall_min(sum(bytes)))\`
      `,
  }),
});

export const overallAverageOperation =
  buildOverallMetricOperation<OverallAverageIndexPatternColumn>({
    type: 'overall_average',
    displayName: i18n.translate('xpack.lens.indexPattern.overallMax', {
      defaultMessage: 'Overall max',
    }),
    ofName: (name?: string) => {
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
    },
    metric: 'average',
    description: i18n.translate('xpack.lens.indexPattern.overall_average.documentation.markdown', {
      defaultMessage: `
Calculates the average of a metric for all data points of a series in the current chart. A series is defined by a dimension using a date histogram or interval function.
Other dimensions breaking down the data like top values or filter are treated as separate series.

If no date histograms or interval functions are used in the current chart, \`overall_average\` is calculating the average over all dimensions no matter the used function

Example: Divergence from the mean:
\`sum(bytes) - overall_average(sum(bytes))\`
      `,
    }),
  });
