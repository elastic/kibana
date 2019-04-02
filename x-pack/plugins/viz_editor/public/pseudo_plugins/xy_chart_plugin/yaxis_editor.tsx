/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import React from 'react';
import { DatasourceField } from '../../../common';
import { selectColumn, updateColumn, VisModel } from '../../../public';
import { columnSummary } from '../../common/components/config_panel';
import { Draggable } from '../../common/components/draggable';

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
  const onDropField = (field: DatasourceField) => {
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
    <Draggable
      canHandleDrop={(f: DatasourceField) => f && f.type === 'number'}
      onDrop={onDropField}
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
    </Draggable>
  );
}
