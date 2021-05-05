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
} from './utils';
import { adjustTimeScaleOnOtherColumnChange } from '../../time_scale_utils';
import { OperationDefinition } from '..';
import { getFormatFromPreviousColumn } from '../helpers';

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
      input: ['field'],
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
    return ofName(columns[column.references[0]]?.label, column.timeScale);
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'derivative');
  },
  buildColumn: ({ referenceIds, previousColumn, layer }) => {
    const ref = layer.columns[referenceIds[0]];
    return {
      label: ofName(ref?.label, previousColumn?.timeScale),
      dataType: 'number',
      operationType: OPERATION_NAME,
      isBucketed: false,
      scale: 'ratio',
      references: referenceIds,
      timeScale: previousColumn?.timeScale,
      filter: previousColumn?.filter,
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  onOtherColumnChanged: adjustTimeScaleOnOtherColumnChange,
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return getErrorsForDateReference(
      layer,
      columnId,
      i18n.translate('xpack.lens.indexPattern.derivative', {
        defaultMessage: 'Differences',
      })
    );
  },
  getDisabledStatus(indexPattern, layer) {
    return checkForDateHistogram(
      layer,
      i18n.translate('xpack.lens.indexPattern.derivative', {
        defaultMessage: 'Differences',
      })
    )?.join(', ');
  },
  timeScalingMode: 'optional',
  filterable: true,
};
