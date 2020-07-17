/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldText } from '@elastic/eui';
import { evaluate } from 'tinymath';
import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';

const mathLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Math',
});

export type MathIndexPatternColumn = FormattedIndexPatternColumn & {
  operationType: 'math';
  params: {
    tinyMathExpression: string;
  };
};

const varnames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

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
    table.columns.push({ id: column.id, name: 'Math' });
    table.rows = table.rows.map((row) => {
      const params: Record<string, number> = {};
      column.children.forEach((child, index) => {
        params[varnames[index]] = row[child.id];
      });
      const result = evaluate(column.params.tinyMathExpression, params);
      return { ...row, [column.id]: result };
    });
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
