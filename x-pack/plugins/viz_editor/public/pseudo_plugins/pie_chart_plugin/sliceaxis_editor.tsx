/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { selectColumn, updateColumn, VisModel } from '../..';
import { DatasourceField, fieldToOperation, SelectOperation } from '../../../common';
import { Draggable } from '../../common/components/draggable';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';

export function SliceAxisEditor({
  col,
  visModel,
  onChangeVisModel,
}: {
  col: string;
  visModel: any;
  onChangeVisModel: (visModel: VisModel) => void;
}) {
  const onDropField = (field: DatasourceField) => {
    const operation: SelectOperation =
      field.type === 'date'
        ? fieldToOperation(field, 'date_histogram')
        : fieldToOperation(field, 'terms');

    onChangeVisModel(updateColumn(col, operation, visModel));
  };

  const column = selectColumn(col, visModel);

  if (!column) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <Draggable
      canHandleDrop={(f: DatasourceField) => f && (f.type === 'string' || f.type === 'date')}
      onDrop={onDropField}
    >
      <OperationEditor
        column={column}
        visModel={visModel}
        onColumnChange={newColumn => {
          onChangeVisModel(updateColumn(col, newColumn, visModel));
        }}
        allowedOperations={['date_histogram', 'terms']}
      >
        {getOperationSummary(column)}
      </OperationEditor>
    </Draggable>
  );
}
