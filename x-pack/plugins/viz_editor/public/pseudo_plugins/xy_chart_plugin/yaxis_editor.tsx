/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourceField } from '../../../common';
import { selectColumn, updateColumn, VisModel } from '../../../public';
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
  const column = selectColumn(col, visModel);

  if (!column) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <OperationEditor
      column={column}
      visModel={visModel}
      onColumnChange={newColumn => {
        onChangeVisModel(updateColumn(col, newColumn, visModel));
      }}
      allowedScale="interval"
      allowedCardinality="single"
      defaultOperator={() => 'sum'}
      canDrop={(f: DatasourceField) => f && f.type === 'number'}
    >
      {getOperationSummary(column)}
    </OperationEditor>
  );
}
