/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';
import React from 'react';
import { EuiFieldText } from '@elastic/eui';

const mathLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Math',
});

export type MathIndexPatternColumn = FormattedIndexPatternColumn & {
  operationType: 'math';
  params: {
    tinyMathExpression: string;
  };
};

export const mathOperation: OperationDefinition<MathIndexPatternColumn> = {
  type: 'math',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.count', {
    defaultMessage: 'Math',
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
      operationType: 'math',
      suggestedPriority,
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
      isClientSideOperation: true,
      params:
        previousColumn && previousColumn.dataType === 'number'
          ? previousColumn.params
          : { tinyMathExpression: '5', format: { id: 'number' } },
    };
  },
  clientSideExecution(column, table) {
    // TODO for each row,  execute column.params.tinyMathExpression, pass in all children columns as params A-Z
    table.columns.push({ id: column.id, name: 'Math' });
    table.rows = table.rows.map((row) => ({ ...row, [column.id]: 0 }));
    return table;
  },
  isTransferable: () => {
    return true;
  },
  showInBuilder: true,
  nonLeaveNode: true,
  canAcceptChild(c, otherC) {
    return !otherC.isBucketed;
  },
  builderParamEditor: ({ setColumn, currentColumn: currentColumn, layerId, dateRange, data }) => {
    return (
      <EuiFieldText
        value={currentColumn.params.tinyMathExpression}
        onChange={(e) => {
          setColumn({
            ...currentColumn,
            params: { ...currentColumn.params, tinyMathExpression: e.target.value },
          });
        }}
      />
    );
  },
};
