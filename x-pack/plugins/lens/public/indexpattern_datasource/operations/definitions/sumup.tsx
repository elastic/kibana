/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';
import { KibanaDatatable, KibanaDatatableRow } from 'src/plugins/expressions';

const mathLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Sum up over',
});

export type SumupIndexPatternColumn = FormattedIndexPatternColumn & {
  operationType: 'sumup';
  buckets: string[];
};

export const sumupOperation: OperationDefinition<SumupIndexPatternColumn> = {
  type: 'sumup',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.count', {
    defaultMessage: 'Sum up over',
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
      operationType: 'sumup',
      suggestedPriority,
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      isClientSideOperation: true,
      params: {
        ...(previousColumn && previousColumn.dataType === 'number'
          ? previousColumn.params
          : { format: { id: 'number' } }),
        // TODO In a real implementation this would walk the tree from the entrypoint to the root, collecting all buckets along the way
        buckets: Object.values(columns)
          .filter((c) => c?.isBucketed)
          .map((c) => c?.id),
      },
    };
  },
  clientSideExecution(column, table) {
    function getBucket(row: KibanaDatatable['rows'][number]) {
      return column.params.buckets.map((b) => row[b]).join(',');
    }
    const sumupMetric = column.children![0].children![0].id;
    const sumupBucket = column.children![0].id;
    table.columns.push({ id: column.id, name: 'Summed up' });
    table.columns = table.columns.filter(c => c.id !== sumupBucket);
    const newRows: KibanaDatatableRow[] = [];
    let currentRow: KibanaDatatableRow | null = null;
    let currentBucket: string = getBucket(table.rows[0]);
    table.rows.forEach(row => {
      if (!currentRow) {
        currentRow = row;
        currentRow[column.id] = currentRow[sumupMetric];
        delete currentRow[sumupBucket];
        return;
      }
      if (getBucket(row) !== currentBucket) {
        // section complete, pushing
        newRows.push(currentRow);
        currentRow = row;
        currentRow[column.id] = currentRow[sumupMetric];
        delete currentRow[sumupBucket];
        return;
      }
      // within a section, adding up
      currentRow[column.id] += row[sumupMetric];
    });
    // push last row
    if (currentRow) {
      newRows.push(currentRow);
    }
    table.rows = newRows;
    return table;
  },
  isTransferable: () => {
    return true;
  },
  showInBuilder: true,
  nonLeaveNode: true,
  canAcceptChild(c, otherC) {
    return otherC.isBucketed && (!c.children || c.children.length === 0);
  },
};
