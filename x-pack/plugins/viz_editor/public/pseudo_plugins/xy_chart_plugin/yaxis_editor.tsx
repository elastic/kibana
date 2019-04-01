/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import React from 'react';
import { columnSummary } from '../../common/components/config_panel';
import { droppable, Field, selectColumn, updateColumn, VisModel } from '../../common/lib';

export function YAxisEditor({
  col,
  visModel,
  onChangeVisModel,
}: {
  col: string;
  visModel: any;
  onChangeVisModel: (visModel: VisModel) => void;
}) {
  const currentOperation: any = selectColumn(col, visModel) || { operation: 'count' };
  const fieldName = currentOperation.argument && currentOperation.argument.field;
  const onDropField = (field: Field) => {
    const operation = fieldName
      ? { ...currentOperation, argument: { ...currentOperation.argument, field: field.name } }
      : { operation: 'sum', argument: { field: field.name } };

    onChangeVisModel(updateColumn(col, operation, visModel));
  };

  const onChangeOperation = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const operationName = e.target.value;
    const operation = {
      ...currentOperation,
      operation: operationName,
    };

    onChangeVisModel(updateColumn(col, operation, visModel));
  };

  const options = [
    {
      value: 'count',
      text: 'Count',
    },
    {
      value: 'avg',
      text: `Average of ${fieldName}`,
    },
    {
      value: 'sum',
      text: `Sum of ${fieldName}`,
    },
  ];

  return (
    <div
      {...droppable({ canHandleDrop: (f: Field) => f && f.type === 'number', drop: onDropField })}
    >
      {fieldName ? (
        <EuiSelect
          options={options}
          value={currentOperation.operation}
          onChange={onChangeOperation}
        />
      ) : (
        columnSummary(selectColumn(col, visModel))
      )}
    </div>
  );
}
