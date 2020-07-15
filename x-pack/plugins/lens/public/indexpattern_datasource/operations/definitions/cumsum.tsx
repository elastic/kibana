/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';

const mathLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Cumulative sum',
});

export type MathIndexPatternColumn = FormattedIndexPatternColumn & {
  operationType: 'cumsum';
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
  buildColumn({ suggestedPriority, field, previousColumn, columnId }) {
    return {
      id: columnId,
      label: mathLabel,
      dataType: 'number',
      operationType: 'cumsum',
      suggestedPriority,
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      params:
        previousColumn && previousColumn.dataType === 'number'
          ? previousColumn.params
          : { format: { id: 'number' } },
    };
  },
  clientSideExecution(column, table) {
    // TODO for each row, sum up the previous rows.
    table.columns.push({ id: column.id, name: 'Cumulative sum' });
    table.rows = table.rows.map((row) => ({ ...row, [column.id]: 0 }));
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
