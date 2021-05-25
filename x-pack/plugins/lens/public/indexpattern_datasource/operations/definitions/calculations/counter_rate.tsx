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
    const timeScale = previousColumn?.timeScale || DEFAULT_TIME_SCALE;
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
      timeShift: previousColumn?.timeShift,
      filter: getFilter(previousColumn, columnParams),
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return getErrorsForDateReference(
      layer,
      columnId,
      i18n.translate('xpack.lens.indexPattern.counterRate', {
        defaultMessage: 'Counter rate',
      })
    );
  },
  getDisabledStatus(indexPattern, layer) {
    return checkForDateHistogram(
      layer,
      i18n.translate('xpack.lens.indexPattern.counterRate', {
        defaultMessage: 'Counter rate',
      })
    )?.join(', ');
  },
  timeScalingMode: 'mandatory',
  filterable: true,
  shiftable: true,
};
