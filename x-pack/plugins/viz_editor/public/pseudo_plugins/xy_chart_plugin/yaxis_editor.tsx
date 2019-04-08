/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourceField, fieldToOperation } from '../../../common';
import { selectColumn, updateColumn, VisModel } from '../../../public';
import { Draggable } from '../../common/components/draggable';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';

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
      : fieldToOperation(field, 'sum');

    onChangeVisModel(updateColumn(col, operation, visModel));
  };

  const column = selectColumn(col, visModel);

  if (!column) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <Draggable
      canHandleDrop={(f: DatasourceField) => f && f.type === 'number'}
      onDrop={onDropField}
    >
      <OperationEditor
        column={column}
        visModel={visModel}
        onColumnChange={newColumn => {
          onChangeVisModel(updateColumn(col, newColumn, visModel));
        }}
        allowedScale="interval"
        allowedCardinality="single"
      >
        {getOperationSummary(column)}
      </OperationEditor>
    </Draggable>
  );
}
