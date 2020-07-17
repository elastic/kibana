/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';
import { KibanaDatatable } from 'src/plugins/expressions';

const mathLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Cumulative sum',
});

export type MathIndexPatternColumn = FormattedIndexPatternColumn & {
  operationType: 'cumsum';
  buckets: string[];
};

export const cumsumOperation: OperationDefinition<MathIndexPatternColumn> = {
  type: 'cumsum',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.count', {
    defaultMessage: 'Cumulative sum',
  }),
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: field.name,
      sourceField: field.name,
    };
  },
  getPossibleOperationForField: (field: IndexPatternField) => {
    if (field.type === 'document') {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  buildColumn({ suggestedPriority, field, previousColumn, columnId, columns }) {
    return {
      id: columnId,
      label: mathLabel,
      dataType: 'number',
      operationType: 'cumsum',
      suggestedPriority,
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      isClientSideOperation: true,
      params: {
        ...(previousColumn && previousColumn.dataType === 'number'
          ? previousColumn.params
          : { format: { id: 'number' } }),
        // TOOD should actually just filter out the first date histogram, not all of them
        buckets: Object.values(columns)
          .filter((c) => c?.isBucketed && c?.operationType !== 'date_histogram')
          .map((c) => c?.id),
      },
    };
  },
  clientSideExecution(column, table) {
    function getBucket(row: KibanaDatatable['rows'][number]) {
      return column.params.buckets.map((b) => row[b]).join(',');
    }
    table.columns.push({ id: column.id, name: 'Cumulative sum' });
    table.rows = table.rows.map((row, index) => {
      const currentBucket = getBucket(row);
      const previous = table.rows.slice(0, index).reverse();
      const veryPreviousRow = previous.find((r) => getBucket(r) === currentBucket);
      row[column.id] =
        (veryPreviousRow ? veryPreviousRow[column.id] : 0) + row[column.children![0].id];
      return row;
    });
    return table;
  },
  isTransferable: () => {
    return true;
  },
  showInBuilder: true,
  nonLeaveNode: true,
  canAcceptChild(c, otherC) {
    return !otherC.isBucketed && (!c.children || c.children.length === 0);
  },
};
