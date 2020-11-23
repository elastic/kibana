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

const ofName = (name?: string) => {
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
};

export type DerivativeIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'derivative';
  };

export const derivativeOperation: OperationDefinition<
  DerivativeIndexPatternColumn,
  'fullReference'
> = {
  type: 'derivative',
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
  getPossibleOperation: () => {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  getDefaultLabel: (column, indexPattern, columns) => {
    return ofName(columns[column.references[0]]?.label);
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'derivative');
  },
  buildColumn: ({ referenceIds, previousColumn, layer }) => {
    const metric = layer.columns[referenceIds[0]];
    return {
      label: ofName(metric?.label),
      dataType: 'number',
      operationType: 'derivative',
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
    return checkForDateHistogram(
      layer,
      i18n.translate('xpack.lens.indexPattern.derivative', {
        defaultMessage: 'Differences',
      })
    );
  },
};
