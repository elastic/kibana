/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ExpressionFunctionAST } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from './column_types';
import { getColumnOrder } from '../../state_helpers';
import { IndexPatternLayer } from '../../types';

export interface DerivativeIndexPatternColumn
  extends FormattedIndexPatternColumn,
    ReferenceBasedIndexPatternColumn {
  operationType: 'derivative';
}

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.derivativeOf', {
    defaultMessage: 'Derivative of {name}',
    values: { name },
  });
}

export const derivativeOperation: OperationDefinition<DerivativeIndexPatternColumn, 'reference'> = {
  type: 'derivative',
  // priority,
  displayName: i18n.translate('xpack.lens.indexPattern.derivative', {
    defaultMessage: 'Derivative',
  }),
  input: 'reference',
  isTransferable: (column, newIndexPattern) => false,

  getPossibleOperation: () => ({
    dataType: 'number',
    isBucketed: false,
    scale: 'ratio',
  }),

  isValid: ({ layer }) => {
    if (
      !layer.columnOrder.some(
        (id) =>
          layer.columns[id].operationType === 'date_histogram' ||
          layer.columns[id].operationType === 'range'
      )
    ) {
      return i18n.translate('xpack.lens.indexPattern.derivativeRequiresHistogram', {
        defaultMessage: 'You must have a date histogram or range function to use the derivative',
      });
    }
    return true;
  },

  requiredReferences: [
    {
      referenceInputs: ['field'],
      validateReferenceMetadata: (meta) => meta.dataType === 'number',
    },
  ],

  create: ({ layer, newId }) => {
    const newLayer: IndexPatternLayer = {
      ...layer,
      columns: {
        ...layer.columns,
        [newId]: {
          label: ofName('Count of Records'),
          dataType: 'number',
          operationType: 'derivative',
          // suggestedPriority,
          isBucketed: false,
          scale: 'ratio',
          references: ['innerCount'],
          params: {
            // format: undefined,
          },
        },
      },
      innerOperations: {
        ...layer.innerOperations,
        innerCount: {
          label: 'Count of Records',
          dataType: 'number',
          isBucketed: false,

          operationType: 'count',
          sourceField: 'Records',
        },
      },
    };

    return {
      ...newLayer,
      columnOrder: getColumnOrder(newLayer),
    };
  },

  toExpression: (layer, columnId, indexPattern) => {
    const bucketedFields = layer.columnOrder.filter(
      (col) =>
        layer.columns[col] &&
        (layer.columns[col].operationType === 'terms' ||
          layer.columns[col].operationType === 'filters')
    );
    const column = layer.columns[columnId];
    const reference = (column as any).references[0] as string;

    return [
      {
        type: 'function',
        function: 'derivative',
        arguments: {
          groupBy: bucketedFields,
          inputColumn: [reference],
          outputColumnId: [columnId],
          outputColumnName: [column.label],
          outputColumnSerializedFormat: [JSON.stringify(column.params?.format ?? {})],
        },
      },
    ] as ExpressionFunctionAST[];
  },

  paramEditor() {
    return (
      <EuiFormRow label="Time scaling factor">
        <EuiSelect options={[{ text: 'None' }, { text: 'Per second' }]} />
      </EuiFormRow>
    );
  },
};
