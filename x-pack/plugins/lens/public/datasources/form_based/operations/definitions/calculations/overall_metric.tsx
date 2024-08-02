/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  AVG_ID,
  MAX_ID,
  MIN_ID,
  OVERALL_AVERAGE_ID,
  OVERALL_AVERAGE_NAME,
  OVERALL_MAX_ID,
  OVERALL_MAX_NAME,
  OVERALL_MIN_ID,
  OVERALL_MIN_NAME,
  OVERALL_SUM_ID,
  OVERALL_SUM_NAME,
  SUM_ID,
} from '@kbn/lens-formula-docs';
import type {
  FormattedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from '../column_types';
import { optionalHistogramBasedOperationToExpression } from './utils';
import type { OperationDefinition } from '..';
import { getFormatFromPreviousColumn } from '../helpers';

type OverallMetricIndexPatternColumn<T extends string> = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: T;
  };

export type OverallSumIndexPatternColumn = OverallMetricIndexPatternColumn<typeof OVERALL_SUM_ID>;
export type OverallMinIndexPatternColumn = OverallMetricIndexPatternColumn<typeof OVERALL_MIN_ID>;
export type OverallMaxIndexPatternColumn = OverallMetricIndexPatternColumn<typeof OVERALL_MAX_ID>;
export type OverallAverageIndexPatternColumn = OverallMetricIndexPatternColumn<
  typeof OVERALL_AVERAGE_ID
>;

function buildOverallMetricOperation<T extends OverallMetricIndexPatternColumn<string>>({
  type,
  displayName,
  ofName,
  metric,
}: {
  type: T['operationType'];
  displayName: string;
  ofName: (name?: string) => string;
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
    getDefaultLabel: (column, columns, indexPattern) => {
      const ref = columns[column.references[0]];
      return ofName(
        ref && 'sourceField' in ref
          ? indexPattern?.getFieldByName(ref.sourceField)?.displayName
          : undefined
      );
    },
    toExpression: (layer, columnId) => {
      return optionalHistogramBasedOperationToExpression(layer, columnId, 'overall_metric', {
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
  };
}

export const overallSumOperation = buildOverallMetricOperation<OverallSumIndexPatternColumn>({
  type: OVERALL_SUM_ID,
  displayName: OVERALL_SUM_NAME,
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
  metric: SUM_ID,
});

export const overallMinOperation = buildOverallMetricOperation<OverallMinIndexPatternColumn>({
  type: OVERALL_MIN_ID,
  displayName: OVERALL_MIN_NAME,
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
  metric: MIN_ID,
});

export const overallMaxOperation = buildOverallMetricOperation<OverallMaxIndexPatternColumn>({
  type: OVERALL_MAX_ID,
  displayName: OVERALL_MAX_NAME,
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
  metric: MAX_ID,
});

export const overallAverageOperation =
  buildOverallMetricOperation<OverallAverageIndexPatternColumn>({
    type: OVERALL_AVERAGE_ID,
    displayName: OVERALL_AVERAGE_NAME,
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
    metric: AVG_ID,
  });
