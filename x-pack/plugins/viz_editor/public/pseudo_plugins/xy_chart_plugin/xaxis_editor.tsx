/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourceField } from '../../../common';
import { selectOperation, updateOperation, VisModel } from '../../../public';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';

export function XAxisEditor({
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
      allowedCardinality="multi"
      defaultOperator={field => (field.type === 'date' ? 'date_histogram' : 'terms')}
      canDrop={(f: DatasourceField) => f.type === 'string' || f.type === 'date'}
    >
      {getOperationSummary(operation)}
    </OperationEditor>
  );
}
