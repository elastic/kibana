/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { selectOperation, updateOperation, VisModel } from '../..';
import { DatasourceField } from '../../../common';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';

export function AngleAxisEditor({
  operationId: col,
  visModel,
  onChangeVisModel,
}: {
  operationId: string;
  visModel: any;
  onChangeVisModel: (visModel: VisModel) => void;
}) {
  const operation = selectOperation(col, visModel);

  if (!operation) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <OperationEditor
      operation={operation}
      visModel={visModel}
      onOperationChange={newColumn => {
        onChangeVisModel(updateOperation(col, newColumn, visModel));
      }}
      allowedScale="interval"
      allowedCardinality="single"
      defaultOperator={() => 'sum'}
      canDrop={(f: DatasourceField) => f && f.type === 'number'}
    >
      {getOperationSummary(operation)}
    </OperationEditor>
  );
}
