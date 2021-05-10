/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPatternLayer } from '../../../types';
import {
  checkForDateHistogram,
  getErrorsForDateReference,
  dateBasedOperationToExpression,
  hasDateField,
} from './utils';
import { OperationDefinition } from '..';
import { getFormatFromPreviousColumn } from '../helpers';
import { Markdown } from '../../../../../../../../src/plugins/kibana_react/public';

const ofName = (name?: string) => {
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
        : undefined
    );
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'cumulative_sum');
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
      operationType: 'cumulative_sum',
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
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return getErrorsForDateReference(
      layer,
      columnId,
      i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
        defaultMessage: 'Cumulative sum',
      })
    );
  },
  getDisabledStatus(indexPattern, layer) {
    return checkForDateHistogram(
      layer,
      i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
        defaultMessage: 'Cumulative sum',
      })
    )?.join(', ');
  },
  filterable: true,
  documentation: {
    section: 'calculation',
    description: (
      <Markdown
        markdown={i18n.translate('xpack.lens.indexPattern.cumulateSum.documentation', {
          defaultMessage: `
# cumulative_sum

Calculates the cumulative sum of a metric over time, adding all previous values of a series to each value. To use this function, you need to configure a date histogram dimension as well.

This calculation will be done separately for separate series defined by filters or top values dimensions.

Example: Visualize the received bytes accumulated over time: \`cumulative_sum(sum(bytes))\`
      `,
        })}
      />
    ),
  },
};
