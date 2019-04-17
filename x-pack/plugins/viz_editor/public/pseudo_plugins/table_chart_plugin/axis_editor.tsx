/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourceField } from '../../../common';
import { removeOperation, selectOperation, updateOperation, VisModel } from '../../../public';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';

export function AxisEditor({
  operationId,
  visModel,
  onChangeVisModel,
}: {
  operationId: string;
  visModel: any;
  onChangeVisModel: (visModel: VisModel) => void;
}) {
  const operation = selectOperation(operationId, visModel);

  if (!operation) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <OperationEditor
      operation={operation}
      visModel={visModel}
      onOperationChange={newOperation => {
        onChangeVisModel(updateOperation(operationId, newOperation, visModel));
      }}
      allowedScale="ordinal"
      defaultOperator={field =>
        field.type === 'date' ? 'date_histogram' : field.type === 'string' ? 'terms' : 'sum'
      }
      canDrop={(f: DatasourceField) => true}
      removable
      onOperationRemove={() => {
        onChangeVisModel(removeOperation(operationId, visModel));
      }}
    >
      {getOperationSummary(operation)}
    </OperationEditor>
  );
}
