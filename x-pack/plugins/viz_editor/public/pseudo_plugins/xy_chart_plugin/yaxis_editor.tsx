/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import React from 'react';
import { DatasourceField, fieldToOperation, SelectOperator } from '../../../common';
import { getOperationsForField, selectColumn, updateColumn, VisModel } from '../../../public';
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

  const fieldName = 'argument' in currentOperation ? currentOperation.argument.field : '';

  const field = visModel.datasource.fields.find((f: DatasourceField) => f.name === fieldName);

  const onDropField = (droppedField: DatasourceField) => {
    const operation = fieldToOperation(droppedField, getOperationsForField(droppedField)[0]);

    onChangeVisModel(updateColumn(col, operation, visModel));
  };

  const onChangeOperation = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!field) {
      return;
    }

    const operationName = e.target.value as SelectOperator;
    const operation = fieldToOperation(field, operationName);

    onChangeVisModel(updateColumn(col, operation, visModel));
  };

  const options = field
    ? getOperationsForField(field).map(opName => ({
        value: opName,
        text: `${opName} of ${fieldName}`,
      }))
    : currentOperation;

  return (
    <Draggable canHandleDrop={(f: DatasourceField) => !!f} onDrop={onDropField}>
      {field ? (
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
